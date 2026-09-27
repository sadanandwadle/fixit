/**
 * FIXIT Real Screenshot Capture Utility (Headless Chrome via CDP)
 * Captures genuine, real high-resolution screenshots of the running application
 * and writes them directly to docs/screenshots/
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9225;
const USER_DATA_DIR = path.join(__dirname, '..', '.chrome_screenshot_profile');
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');

class ChromeSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await this.send('Runtime.enable');
    await this.send('Page.enable');
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 1200));
  }

  async evaluate(expression, arg = null) {
    let exprStr;
    if (typeof expression === 'function') {
      exprStr = arg !== null ? `(${expression.toString()})(${JSON.stringify(arg)})` : `(${expression.toString()})()`;
    } else {
      exprStr = expression;
    }
    const res = await this.send('Runtime.evaluate', {
      expression: exprStr,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async waitForSelector(selector, timeoutMs = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const exists = await this.evaluate((sel) => Boolean(document.querySelector(sel)), selector);
      if (exists) return true;
      await new Promise((r) => setTimeout(r, 200));
    }
    return false;
  }

  async captureScreenshot(filename) {
    const result = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    const fullPath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(fullPath, buffer);
    console.log(`✓ Saved screenshot: ${filename} (${Math.round(buffer.length / 1024)} KB)`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

const checkServer = (url) => {
  return new Promise((resolve) => {
    http.get(url, (res) => resolve(res.statusCode === 200)).on('error', () => resolve(false));
  });
};

async function runScreenshotCapture() {
  console.log('====================================================');
  console.log('       FIXIT REAL APPLICATION SCREENSHOT CAPTURE    ');
  console.log('====================================================\n');

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let backendProc = null;
  let frontendProc = null;

  // 1. Ensure Backend is running
  const isBackendUp = await checkServer('http://localhost:5000/api/health');
  if (!isBackendUp) {
    console.log('Starting Backend Server on port 5000...');
    backendProc = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    let attempts = 0;
    while (attempts < 15 && !(await checkServer('http://localhost:5000/api/health'))) {
      await new Promise((r) => setTimeout(r, 1000));
      attempts++;
    }
  }
  console.log('✓ Backend API is ready on http://localhost:5000');

  // 2. Ensure Frontend is running
  const isFrontendUp = await checkServer('http://localhost:5173');
  if (!isFrontendUp) {
    console.log('Starting Frontend Preview Server on port 5173...');
    frontendProc = spawn('npm', ['run', 'preview', '--', '--port', '5173'], {
      cwd: path.join(__dirname, '../../client'),
      stdio: 'ignore',
      shell: true,
    });
    let attempts = 0;
    while (attempts < 15 && !(await checkServer('http://localhost:5173'))) {
      await new Promise((r) => setTimeout(r, 1000));
      attempts++;
    }
  }
  console.log('✓ Frontend Client is ready on http://localhost:5173');

  if (fs.existsSync(USER_DATA_DIR)) {
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch (_) {}
  }

  console.log('Launching Headless Chrome instance...');
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      '--window-size=1440,900',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
    ],
    { stdio: 'ignore' }
  );

  await new Promise((r) => setTimeout(r, 2000));

  try {
    const newTabRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?http://localhost:5173`, {
      method: 'PUT',
    });
    const tabData = await newTabRes.json();
    const session = new ChromeSession(tabData.webSocketDebuggerUrl);
    await session.connect();

    // Set viewport
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Home Page
    console.log('\nCapturing 01_home_page.png...');
    await session.navigate('http://localhost:5173/');
    await session.waitForSelector('h1', 6000);
    await new Promise((r) => setTimeout(r, 800));
    await session.captureScreenshot('01_home_page.png');

    // 2. Services Page
    console.log('\nCapturing 02_services_page.png...');
    await session.navigate('http://localhost:5173/services');
    await session.waitForSelector('h1', 6000);
    await new Promise((r) => setTimeout(r, 800));
    await session.captureScreenshot('02_services_page.png');

    // 3. Provider Discovery List
    console.log('\nCapturing 03_provider_discovery_list.png...');
    await session.navigate('http://localhost:5173/providers');
    await session.waitForSelector('h1', 6000);
    await new Promise((r) => setTimeout(r, 1200));
    await session.captureScreenshot('03_provider_discovery_list.png');

    // 4. Provider Discovery Map View
    console.log('\nCapturing 04_provider_discovery_map.png...');
    await session.evaluate(() => {
      const mapBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Map View')
      );
      if (mapBtn) mapBtn.click();
    });
    await session.waitForSelector('.leaflet-container', 6000);
    await new Promise((r) => setTimeout(r, 1500));
    await session.captureScreenshot('04_provider_discovery_map.png');

    // Register Accounts for Authenticated Pages
    const ts = Date.now();
    const adminUser = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Super Admin',
        email: `admin_shot_${ts}@fixit.com`,
        phone: '9900011111',
        password: 'password123',
        role: 'admin',
      }),
    }).then((r) => r.json());

    const provUser = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Expert Electrician',
        email: `prov_shot_${ts}@fixit.com`,
        phone: '9900022222',
        password: 'password123',
        role: 'provider',
        businessName: 'SparkFix Electricals',
        category: 'Electrician',
        hourlyRate: 599,
      }),
    }).then((r) => r.json());

    const custUser = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rahul Sharma',
        email: `cust_shot_${ts}@fixit.com`,
        phone: '9900033333',
        password: 'password123',
        role: 'customer',
      }),
    }).then((r) => r.json());

    // 5. Provider Location Management
    console.log('\nCapturing 05_provider_location_picker.png...');
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/provider/location';
      },
      { token: provUser.token, user: provUser.user }
    );
    await session.waitForSelector('.leaflet-container', 8000);
    await new Promise((r) => setTimeout(r, 1500));
    await session.captureScreenshot('05_provider_location_picker.png');

    // 6. Provider Dashboard
    console.log('\nCapturing 06_provider_dashboard.png...');
    await session.navigate('http://localhost:5173/provider/dashboard');
    await session.waitForSelector('h1', 6000);
    await new Promise((r) => setTimeout(r, 1000));
    await session.captureScreenshot('06_provider_dashboard.png');

    // 7. Customer Dashboard
    console.log('\nCapturing 07_customer_dashboard.png...');
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/customer/dashboard';
      },
      { token: custUser.token, user: custUser.user }
    );
    await session.waitForSelector('h1', 6000);
    await new Promise((r) => setTimeout(r, 1000));
    await session.captureScreenshot('07_customer_dashboard.png');

    // 8. Notifications Center
    console.log('\nCapturing 08_notifications_center.png...');
    await session.navigate('http://localhost:5173/notifications');
    await session.waitForSelector('h1', 6000);
    await new Promise((r) => setTimeout(r, 1000));
    await session.captureScreenshot('08_notifications_center.png');

    // 9. Admin Dashboard - Overview Tab
    console.log('\nCapturing 09_admin_dashboard_overview.png...');
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/admin';
      },
      { token: adminUser.token, user: adminUser.user }
    );
    await session.waitForSelector('h1', 8000);
    // Wait for overview cards
    const startWait = Date.now();
    while (Date.now() - startWait < 8000) {
      const ready = await session.evaluate(() =>
        document.body.innerText.toLowerCase().includes('total users')
      );
      if (ready) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    await new Promise((r) => setTimeout(r, 1000));
    await session.captureScreenshot('09_admin_dashboard_overview.png');

    // 10. Admin Providers Verification Tab
    console.log('\nCapturing 10_admin_providers_verification.png...');
    await session.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Providers')
      );
      if (tab) tab.click();
    });
    await session.waitForSelector('table', 6000);
    await new Promise((r) => setTimeout(r, 1000));
    await session.captureScreenshot('10_admin_providers_verification.png');

    // 11. Admin Services Management Tab
    console.log('\nCapturing 11_admin_services_management.png...');
    await session.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Services')
      );
      if (tab) tab.click();
    });
    await session.waitForSelector('table', 6000);
    await new Promise((r) => setTimeout(r, 1000));
    await session.captureScreenshot('11_admin_services_management.png');

    // 12. Admin Audit Logs Tab
    console.log('\nCapturing 12_admin_audit_logs.png...');
    await session.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Audit Logs')
      );
      if (tab) tab.click();
    });
    await session.waitForSelector('table', 6000);
    await new Promise((r) => setTimeout(r, 1000));
    await session.captureScreenshot('12_admin_audit_logs.png');

    console.log('\nAll 12 screenshots captured successfully into docs/screenshots/!');
    session.close();
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    chromeProcess.kill();
    if (backendProc) backendProc.kill();
    if (frontendProc) frontendProc.kill();
    if (fs.existsSync(USER_DATA_DIR)) {
      try {
        fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
      } catch (_) {}
    }
  }
}

runScreenshotCapture().catch((e) => {
  console.error('Fatal screenshot error:', e);
  process.exit(1);
});
