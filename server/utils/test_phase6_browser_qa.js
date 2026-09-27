// server/utils/test_phase6_browser_qa.js
// Phase 6 End-to-End Browser QA Runner using Chrome DevTools Protocol (CDP) & native WebSocket

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9223;
const USER_DATA_DIR = path.join(__dirname, '../../.chrome_test_profile_p6');

class ChromeSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.consoleErrors = [];
    this.networkErrors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          this.consoleErrors.push(
            msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ')
          );
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(
          msg.params.exceptionDetails?.text || JSON.stringify(msg.params.exceptionDetails)
        );
      }
      if (this.callbacks.has(msg.id)) {
        const { resolve, reject, method } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(`${method} failed: ${msg.error.message}`));
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

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await new Promise((r) => setTimeout(r, 200));
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Helpers to check server status
const checkServer = (url) => {
  return new Promise((resolve) => {
    http.get(url, (res) => resolve(res.statusCode === 200)).on('error', () => resolve(false));
  });
};

async function runBrowserQA() {
  console.log('====================================================');
  console.log('       STARTING FIXIT PHASE 6 MANUAL BROWSER QA     ');
  console.log('         (Maps, Location, Admin & E2E Specs)        ');
  console.log('====================================================\n');

  let backendProc = null;
  let frontendProc = null;

  // 1. Ensure Backend is running on port 5000
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

  // 2. Ensure Frontend is running on port 5173
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

  // Clean user data dir if exists
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
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-gpu',
    ],
    { stdio: 'ignore' }
  );

  await new Promise((r) => setTimeout(r, 2000));

  let passed = 0;
  let failed = 0;
  function report(cond, name) {
    if (cond) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    const versionRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const versionData = await versionRes.json();
    console.log(`Connected to Chrome version: ${versionData['Browser']}`);

    // Create a new target page
    const newTabRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?http://localhost:5173`, {
      method: 'PUT',
    });
    const tabData = await newTabRes.json();
    const session = new ChromeSession(tabData.webSocketDebuggerUrl);
    await session.connect();

    // ----------------------------------------------------
    // SETUP: Register Admin, Provider, Customer via API
    // ----------------------------------------------------
    console.log('\n--- Setup Test Accounts via API ---');
    const ts = Date.now();
    const adminEmail = `admin_bqa_${ts}@fixit.com`;
    const provEmail = `prov_bqa_${ts}@fixit.com`;
    const custEmail = `cust_bqa_${ts}@fixit.com`;
    const pwd = 'password123';

    // 1. Admin
    const adminReg = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chief Admin',
        email: adminEmail,
        phone: '9900011111',
        password: pwd,
        role: 'admin',
      }),
    }).then((r) => r.json());
    const adminToken = adminReg.token;
    const adminUser = adminReg.user;

    // 2. Provider
    const provReg = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sunil Rao',
        email: provEmail,
        phone: '9900022222',
        password: pwd,
        role: 'provider',
        businessName: 'Sunil ElectroCare',
      }),
    }).then((r) => r.json());
    const provToken = provReg.token;
    const providerId = provReg.provider._id;
    const provUser = provReg.user;

    // 3. Customer
    const custReg = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Sen',
        email: custEmail,
        phone: '9900033333',
        password: pwd,
        role: 'customer',
      }),
    }).then((r) => r.json());
    const custToken = custReg.token;
    const custUser = custReg.user;

    // ==========================================
    // TEST 1 — PROVIDER LOCATION & MAP PICKER UI
    // ==========================================
    // Inject Provider Auth into browser localStorage
    await session.navigate('http://localhost:5173/');
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/provider/location';
      },
      { token: provToken, user: provUser }
    );
    await new Promise((r) => setTimeout(r, 1000));
    await session.waitForSelector('h1', 8000);

    const pageHeading = await session.evaluate(() => document.querySelector('h1')?.innerText || '');
    report(pageHeading.includes('Service Location & Coverage'), 'Provider Location page loads with title');

    // Check Leaflet map container rendered
    const hasLeafletMap = await session.evaluate(() => {
      return Boolean(document.querySelector('.leaflet-container'));
    });
    report(hasLeafletMap, 'Interactive Leaflet OpenStreetMap container is mounted');

    // Check OpenStreetMap tiles loaded
    const hasTileLayer = await session.evaluate(() => {
      const tiles = document.querySelectorAll('.leaflet-tile-pane img');
      return tiles.length > 0;
    });
    report(hasTileLayer, 'OpenStreetMap tile images are rendered');

    // Verify Street address and radius inputs
    const hasAddressForm = await session.evaluate(() => {
      return Boolean(document.querySelector('input[placeholder*="100 Feet Road"]'));
    });
    report(hasAddressForm, 'Address input fields present');

    // Enter address and save
    await session.evaluate(() => {
      const streetInput = document.querySelector('input[placeholder*="100 Feet Road"]');
      if (streetInput) {
        streetInput.value = '100 Feet Road, Indiranagar';
        streetInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const cityInput = document.querySelector('input[placeholder*="Bangalore"]');
      if (cityInput) {
        cityInput.value = 'Bangalore';
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    const successToast = await session.evaluate(() => document.body.innerText);
    report(
      successToast.includes('saved successfully'),
      'Location and coverage form submitted and success feedback displayed'
    );

    // ==========================================
    // TEST 2 — CUSTOMER DISCOVERY & MAP VIEW
    // ==========================================
    console.log('\n--- Test 2: Customer Discovery & Map View ---');
    await session.navigate('http://localhost:5173/providers');
    await new Promise((r) => setTimeout(r, 1500));

    const discoveryTitle = await session.evaluate(() => document.querySelector('h1')?.innerText || '');
    report(discoveryTitle.includes('Find Service Providers'), 'Customer Discovery page loaded');

    // Toggle Map View
    await session.evaluate(() => {
      const mapBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Map View')
      );
      if (mapBtn) mapBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const mapMountedInDiscovery = await session.evaluate(() => {
      return Boolean(document.querySelector('.leaflet-container'));
    });
    report(mapMountedInDiscovery, 'Map View successfully mounted in Customer Discovery');

    // Switch back to List View
    await session.evaluate(() => {
      const listBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('List View')
      );
      if (listBtn) listBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Verify Near Me button present
    const hasNearMeBtn = await session.evaluate(() => {
      return Boolean(
        Array.from(document.querySelectorAll('button')).find((b) =>
          b.innerText.includes('Find Providers Near Me')
        )
      );
    });
    report(hasNearMeBtn, '"Find Providers Near Me" button is available');

    // ==========================================
    // TEST 3 — ADMIN DASHBOARD CONSOLE
    console.log('\n--- Test 3: Admin Dashboard Console ---');
    // Inject Admin Auth into localStorage
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/admin';
      },
      { token: adminToken, user: adminUser }
    );
    await new Promise((r) => setTimeout(r, 1000));
    await session.waitForSelector('h1', 8000);

    const adminHeading = await session.evaluate(() => document.querySelector('h1')?.innerText || '');
    report(adminHeading.includes('Admin Management Console'), 'Admin Console loaded at /admin');

    // Check Overview Metric Cards (poll in Node until dashboard data is rendered)
    let overviewStats = { hasUsers: false, hasProviders: false, hasBookings: false, hasRevenue: false };
    const startWait = Date.now();
    while (Date.now() - startWait < 10000) {
      overviewStats = await session.evaluate(() => {
        const body = (document.body.innerText || '').toLowerCase();
        return {
          hasUsers: body.includes('total users'),
          hasProviders: body.includes('service providers'),
          hasBookings: body.includes('total bookings'),
          hasRevenue: body.includes('total revenue'),
        };
      });
      if (
        overviewStats &&
        overviewStats.hasUsers &&
        overviewStats.hasProviders &&
        overviewStats.hasBookings &&
        overviewStats.hasRevenue
      ) {
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    report(
      Boolean(
        overviewStats &&
          overviewStats.hasUsers &&
          overviewStats.hasProviders &&
          overviewStats.hasBookings &&
          overviewStats.hasRevenue
      ),
      'Overview metric cards displayed (Users, Providers, Bookings, Revenue)'
    );

    // Switch to Users Tab
    await session.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Users')
      );
      if (tab) tab.click();
    });
    await session.waitForSelector('table', 6000);

    const userTablePresent = await session.evaluate(() => {
      return Boolean(document.querySelector('table'));
    });
    report(userTablePresent, 'Users Tab table loaded');

    // Switch to Providers Tab
    await session.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Providers')
      );
      if (tab) tab.click();
    });
    await session.waitForSelector('table', 6000);

    const hasVerifyBtn = await session.evaluate(() => {
      return Boolean(
        Array.from(document.querySelectorAll('button')).find((b) =>
          b.innerText.includes('Verify Provider') || b.innerText.includes('Revoke Verification')
        )
      );
    });
    report(hasVerifyBtn, 'Providers Tab displays verification toggle buttons');

    // Switch to Services Tab
    await session.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Services')
      );
      if (tab) tab.click();
    });
    await session.waitForSelector('table', 6000);

    const hasAddServiceBtn = await session.evaluate(() => {
      return Boolean(
        Array.from(document.querySelectorAll('button')).find((b) =>
          b.innerText.includes('Add New Service')
        )
      );
    });
    report(hasAddServiceBtn, 'Services Tab displays "Add New Service" manager button');

    // Switch to Audit Logs Tab
    await session.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Audit Logs')
      );
      if (tab) tab.click();
    });
    await session.waitForSelector('table', 6000);

    const hasLogsTable = await session.evaluate(() => {
      return Boolean(document.querySelector('table'));
    });
    report(hasLogsTable, 'Audit Logs Tab displays platform event log table');

    // ==========================================
    // TEST 4 — ROLE-BASED ACCESS CONTROL
    // ==========================================
    console.log('\n--- Test 4: Role-Based Route Protection ---');
    // Switch auth to customer and navigate to /admin
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/admin';
      },
      { token: custToken, user: custUser }
    );
    await new Promise((r) => setTimeout(r, 1000));
    await session.waitForSelector('h2', 6000);

    const accessRestricted = await session.evaluate(() => {
      const path = window.location.pathname;
      const text = document.body.innerText;
      return (
        path !== '/admin' ||
        text.includes('Access Restricted') ||
        text.includes('Access Denied') ||
        text.includes('authorized')
      );
    });
    report(accessRestricted, 'Customer cannot access /admin (Protected by ProtectedRoute)');

    // ==========================================
    // TEST 5 — RESPONSIVE UI TEST
    // ==========================================
    console.log('\n--- Test 5: Responsive Viewports Check ---');
    const viewports = [
      { width: 1920, height: 1080, name: '1920px (Desktop Full HD)' },
      { width: 1366, height: 768, name: '1366px (Laptop Standard)' },
      { width: 768, height: 1024, name: '768px (Tablet)' },
      { width: 390, height: 844, name: '390px (iPhone 14 / Mobile)' },
      { width: 375, height: 667, name: '375px (iPhone SE / Small Mobile)' },
    ];

    for (const vp of viewports) {
      await session.setViewport(vp.width, vp.height);
      const overflow = await session.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      report(!overflow, `Responsive at ${vp.name}: No horizontal scroll overflow`);
    }

    // ==========================================
    // TEST 6 — BROWSER CONSOLE ERRORS
    // ==========================================
    console.log('\n--- Test 6: Browser Console Error Audit ---');
    const criticalErrors = session.consoleErrors.filter(
      (e) => !e.includes('favicon.ico') && !e.includes('ResizeObserver')
    );
    report(
      criticalErrors.length === 0,
      `Zero critical console errors (count: ${criticalErrors.length})`
    );
    if (criticalErrors.length > 0) {
      console.error('Console errors:', criticalErrors);
    }

    session.close();
  } catch (err) {
    console.error('Browser QA encountered unexpected error:', err);
    failed++;
  } finally {
    chromeProcess.kill();
    if (backendProc) backendProc.kill();
    if (frontendProc) frontendProc.kill();
  }

  console.log('\n====================================================');
  console.log(` PHASE 6 BROWSER QA COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runBrowserQA().catch((e) => {
  console.error('Fatal Browser QA error:', e);
  process.exit(1);
});
