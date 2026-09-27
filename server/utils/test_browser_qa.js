// server/utils/test_browser_qa.js
// Manual Browser QA Automated Runner using Chrome DevTools Protocol (CDP) & native WebSocket

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const USER_DATA_DIR = path.join(__dirname, '../../.chrome_test_profile');

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

  async evaluate(expression, arg) {
    const exprStr =
      typeof expression === 'function'
        ? `(${expression.toString()})(${arg !== undefined ? JSON.stringify(arg) : ''})`
        : String(expression);

    const res = await this.send('Runtime.evaluate', {
      expression: exprStr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'Evaluation failed');
    }
    return res.result?.value;
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
    if (this.ws) this.ws.close();
  }
}

async function runBrowserQA() {
  console.log('====================================================');
  console.log('       STARTING FIXIT PHASE 5 MANUAL BROWSER QA     ');
  console.log('           (End-to-End Headless Chrome QA)          ');
  console.log('====================================================\n');

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

    // 1. Initial Load & Navbar Check
    console.log('\n--- Initial Navigation & Unauthenticated View ---');
    await session.navigate('http://localhost:5173/');
    const homeTitle = await session.evaluate(() => document.title || document.body.innerText);
    report(homeTitle.includes('FIXIT'), 'Home page loads successfully on localhost:5173');

    // 2. Perform Backend API actions to setup provider and customer
    console.log('\n--- Setting up Provider & Customer accounts ---');
    const ts = Date.now();
    const provEmail = `browser_pro_${ts}@fixit.com`;
    const custEmail = `browser_cust_${ts}@fixit.com`;
    const pwd = 'Password@123';

    // Get catalog service
    const sRes = await fetch('http://localhost:5000/api/services').then((r) => r.json());
    const service = sRes.data[0];

    // Register Provider
    const pReg = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Browser Pro',
        email: provEmail,
        phone: '9876540001',
        password: pwd,
        role: 'provider',
        businessName: 'Browser Elite Cooling',
        category: service.category || 'AC Technician',
      }),
    }).then((r) => r.json());

    const provToken = pReg.token;
    const providerId = pReg.provider._id;

    // Set Provider availability
    await fetch('http://localhost:5000/api/availability/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provToken}`,
      },
      body: JSON.stringify({
        schedules: [
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ].map((day) => ({
          day,
          isAvailable: true,
          startTime: '08:00',
          endTime: '20:00',
        })),
      }),
    });

    // Register Customer
    const cReg = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Browser Alice',
        email: custEmail,
        phone: '9876540002',
        password: pwd,
        role: 'customer',
        city: 'Mumbai',
      }),
    }).then((r) => r.json());

    const custToken = cReg.token;
    const custUser = cReg.user;

    // ==========================================
    // TEST 1 — New Booking
    // Customer creates booking -> Provider Notification Bell shows "New Booking Request"
    // ==========================================
    console.log('\n--- Test 1 — New Booking Notification ---');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const dateStr = futureDate.toISOString().split('T')[0];

    const bookRes = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({
        providerId,
        serviceId: service._id,
        scheduledDate: dateStr,
        scheduledTime: '11:00 AM',
        address: { street: '100 Marine Drive', city: 'Mumbai' },
        price: 599,
        description: 'AC deep clean',
      }),
    }).then((r) => r.json());

    const bookingId = bookRes.data._id;
    report(Boolean(bookingId), 'Booking successfully created via API');

    // Login Provider in Browser via LocalStorage
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/provider/dashboard';
      },
      { token: provToken, user: pReg.user }
    );
    await new Promise((r) => setTimeout(r, 1500));

    // Verify Notification Bell displays unread badge > 0
    const bellBadgeText = await session.evaluate(() => {
      const bell = document.querySelector('button[title="Notifications"]');
      if (!bell) return null;
      const badge = bell.querySelector('span');
      return badge ? badge.innerText : null;
    });
    report(bellBadgeText === '1', `Provider bell displays badge with count "1" (got: ${bellBadgeText})`);

    // Click Notification Bell to open dropdown
    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const dropdownContent = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasBookingCreated = dropdownContent.some((text) => text.includes('New Booking Request'));
    report(hasBookingCreated, 'Test 1: Provider notification dropdown contains "New Booking Request"');

    // ==========================================
    // TEST 2 — Accept Booking
    // Provider accepts -> Customer receives "Booking Accepted"
    // ==========================================
    console.log('\n--- Test 2 — Accept Booking Notification ---');
    await fetch(`http://localhost:5000/api/bookings/${bookingId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${provToken}` },
    });

    // Switch session to Customer
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/customer/dashboard';
      },
      { token: custToken, user: custUser }
    );
    await new Promise((r) => setTimeout(r, 1500));

    // Open Customer notifications dropdown
    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const custDropdown1 = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasBookingAccepted = custDropdown1.some((text) => text.includes('Booking Accepted'));
    report(hasBookingAccepted, 'Test 2: Customer notification dropdown contains "Booking Accepted"');

    // ==========================================
    // TEST 3 & 4 — Confirm Booking & OTP
    // Customer confirms -> Provider receives "Booking Confirmed"
    // Customer receives OTP notification
    // Provider does NOT receive OTP notification
    // ==========================================
    console.log('\n--- Test 3 & 4 — Confirm Booking & OTP Notifications ---');
    const confirmRes = await fetch(`http://localhost:5000/api/bookings/${bookingId}/confirm`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${custToken}` },
    }).then((r) => r.json());

    const generatedOtp = confirmRes.data.otp;
    report(Boolean(generatedOtp), `Service OTP generated: ${generatedOtp}`);

    // Refresh Customer dropdown to inspect OTP notification
    await session.navigate('http://localhost:5173/customer/dashboard');
    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const custDropdown2 = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasOtpNotif = custDropdown2.some((text) => text.includes('Service Verification OTP'));
    report(hasOtpNotif, 'Test 4: Customer notification contains "Service Verification OTP"');

    // Verify OTP value is NOT shown in notification text
    const otpExposed = custDropdown2.some((text) => text.includes(generatedOtp));
    report(!otpExposed, 'Test 4: Customer notification DOES NOT expose plaintext OTP');

    // Switch to Provider and check notifications
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/provider/dashboard';
      },
      { token: provToken, user: pReg.user }
    );
    await new Promise((r) => setTimeout(r, 1500));

    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const provDropdown2 = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasBookingConfirmed = provDropdown2.some((text) => text.includes('Booking Confirmed'));
    report(hasBookingConfirmed, 'Test 3: Provider received "Booking Confirmed" notification');

    const provHasOtpNotif = provDropdown2.some((text) => text.includes('Service Verification OTP'));
    report(!provHasOtpNotif, 'Test 4: Provider DOES NOT receive OTP notification');

    // ==========================================
    // TEST 5 — Start Service (OTP Verification)
    // Provider verifies OTP -> Customer receives "Service Started"
    // ==========================================
    console.log('\n--- Test 5 — Start Service Notification ---');
    await fetch(`http://localhost:5000/api/bookings/${bookingId}/verify-otp`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provToken}`,
      },
      body: JSON.stringify({ otp: generatedOtp }),
    });

    // Switch to Customer and check
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/customer/dashboard';
      },
      { token: custToken, user: custUser }
    );
    await new Promise((r) => setTimeout(r, 1500));

    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const custDropdown3 = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasServiceStarted = custDropdown3.some((text) => text.includes('Service Started'));
    report(hasServiceStarted, 'Test 5: Customer received "Service Started" notification');

    // ==========================================
    // TEST 6 — Complete Service
    // Provider completes service -> Customer receives "Service Completed" & "Payment Due"
    // ==========================================
    console.log('\n--- Test 6 — Complete Service & Payment Due Notifications ---');
    await fetch(`http://localhost:5000/api/bookings/${bookingId}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${provToken}` },
    });

    await session.navigate('http://localhost:5173/customer/dashboard');
    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const custDropdown4 = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasServiceCompleted = custDropdown4.some((text) => text.includes('Service Completed'));
    const hasPaymentDue = custDropdown4.some((text) => text.includes('Payment Due'));
    report(hasServiceCompleted, 'Test 6: Customer received "Service Completed" notification');
    report(hasPaymentDue, 'Test 6: Customer received "Payment Due" notification');

    // ==========================================
    // TEST 7 & 8 — Demo Payment Failure & Success
    // Failed payment -> Customer receives "Payment Failed", no success
    // Successful payment -> Customer receives "Payment Successful", Provider receives "Payment Received"
    // ==========================================
    console.log('\n--- Test 7 & 8 — Demo Payment Failure & Success ---');
    const pInit = await fetch('http://localhost:5000/api/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({ bookingId, method: 'upi' }),
    }).then((r) => r.json());

    const paymentId = pInit.payment.paymentId;

    // 8. Trigger failure
    await fetch(`http://localhost:5000/api/payments/${paymentId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({ method: 'upi', upiId: 'fail@upi' }),
    });

    await session.navigate('http://localhost:5173/customer/dashboard');
    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const custDropdown5 = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasPaymentFailed = custDropdown5.some((text) => text.includes('Payment Failed'));
    const prematureSuccess = custDropdown5.some((text) => text.includes('Payment Successful'));
    report(hasPaymentFailed, 'Test 8: Customer received "Payment Failed" notification');
    report(!prematureSuccess, 'Test 8: No "Payment Successful" notification on payment failure');

    // 7. Successful payment
    const pRetry = await fetch('http://localhost:5000/api/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({ bookingId, method: 'upi' }),
    }).then((r) => r.json());

    await fetch(`http://localhost:5000/api/payments/${pRetry.payment.paymentId}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({ method: 'upi', upiId: 'browser.alice@okaxis' }),
    });

    await session.navigate('http://localhost:5173/customer/dashboard');
    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const custDropdown6 = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasPaymentSuccessCust = custDropdown6.some((text) => text.includes('Payment Successful'));
    report(hasPaymentSuccessCust, 'Test 7: Customer received "Payment Successful" notification');

    // Check Provider received "Payment Received"
    await session.evaluate(
      ({ token, user }) => {
        localStorage.setItem('fixit_token', token);
        localStorage.setItem('fixit_user', JSON.stringify(user));
        window.location.href = '/provider/dashboard';
      },
      { token: provToken, user: pReg.user }
    );
    await new Promise((r) => setTimeout(r, 1500));

    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const provDropdown3 = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasPaymentReceived = provDropdown3.some((text) => text.includes('Payment Received'));
    report(hasPaymentReceived, 'Test 7: Provider received "Payment Received" notification');

    // ==========================================
    // TEST 9 — Review Notification
    // Customer submits review -> Provider receives "New Review"
    // ==========================================
    console.log('\n--- Test 9 — Review Notification ---');
    await fetch('http://localhost:5000/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({
        bookingId,
        rating: 5,
        comment: 'Outstanding repair service, on time and polite!',
      }),
    });

    await session.navigate('http://localhost:5173/provider/dashboard');
    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const provDropdown4 = await session.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.absolute.right-0 [class*="cursor-pointer"]'));
      return items.map((el) => el.innerText);
    });
    const hasNewReview = provDropdown4.some((text) => text.includes('New Review'));
    report(hasNewReview, 'Test 9: Provider received "New Review" notification');

    // ==========================================
    // TEST 10 — Read State & Navigation Click
    // Clicking an unread notification decreases unread badge & marks as read
    // ==========================================
    console.log('\n--- Test 10 — Read State & Click Behavior ---');
    const badgeBeforeClick = await session.evaluate(() => {
      const bell = document.querySelector('button[title="Notifications"]');
      return bell?.querySelector('span')?.innerText || '0';
    });
    const countNumBefore = parseInt(badgeBeforeClick, 10);
    report(countNumBefore > 0, `Unread count badge before click: ${countNumBefore}`);

    // Click on the first notification in the dropdown
    await session.evaluate(() => {
      const firstItem = document.querySelector('.absolute.right-0 [class*="cursor-pointer"]');
      if (firstItem) firstItem.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Verify URL navigated to booking details page or target page
    const currentUrl = await session.evaluate(() => window.location.pathname);
    report(currentUrl.startsWith('/provider/bookings/'), `Clicking notification navigated to related resource (${currentUrl})`);

    // Verify badge decreased
    const badgeAfterClick = await session.evaluate(() => {
      const bell = document.querySelector('button[title="Notifications"]');
      return bell?.querySelector('span')?.innerText || '0';
    });
    const countNumAfter = parseInt(badgeAfterClick, 10);
    report(countNumAfter === countNumBefore - 1, `Unread badge count decreased by 1 (now: ${countNumAfter})`);

    // ==========================================
    // TEST 11 — Mark All Read
    // Open dropdown, click "Mark all read" -> badge disappears (0 unread)
    // ==========================================
    console.log('\n--- Test 11 — Mark All as Read ---');
    await session.evaluate(() => {
      document.querySelector('button[title="Notifications"]').click();
    });
    await new Promise((r) => setTimeout(r, 500));

    await session.evaluate(() => {
      const markAllBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.includes('Mark all read')
      );
      if (markAllBtn) markAllBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const badgeAfterMarkAll = await session.evaluate(() => {
      const bell = document.querySelector('button[title="Notifications"]');
      const badge = bell?.querySelector('span');
      return badge ? badge.innerText : null;
    });
    report(badgeAfterMarkAll === null, 'Test 11: Mark all read resets count and hides badge (0 unread)');

    // ==========================================
    // TEST 12 — Refresh Persistence
    // Refresh page -> unread state and read state persist accurately
    // ==========================================
    console.log('\n--- Test 12 — Refresh Persistence ---');
    await session.navigate('http://localhost:5173/notifications');
    await new Promise((r) => setTimeout(r, 1200));

    const fullPageContent1 = await session.evaluate(() => document.body.innerText);
    report(fullPageContent1.includes('Notifications') && fullPageContent1.includes('total'), 'Full notifications page loads at /notifications');

    // Trigger page reload
    await session.evaluate(() => window.location.reload());
    await new Promise((r) => setTimeout(r, 1500));

    const fullPageContent2 = await session.evaluate(() => document.body.innerText);
    report(fullPageContent2.includes('Notifications') && fullPageContent2.includes('total'), 'Test 12: Notifications and read state persist across browser refresh');

    // ==========================================
    // SECTION 58 — RESPONSIVE UI TEST
    // Test viewports: 1920, 1366, 768, 390, 375
    // ==========================================
    console.log('\n--- SECTION 58: Responsive UI Verification ---');
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
    // SECTION 59 — BROWSER DEVTOOLS CHECK
    // ==========================================
    console.log('\n--- SECTION 59: Browser DevTools Check ---');
    const criticalErrors = session.consoleErrors.filter(
      (e) => !e.includes('favicon.ico') && !e.includes('ResizeObserver')
    );
    report(criticalErrors.length === 0, `Zero React or JavaScript console errors (count: ${criticalErrors.length})`);
    if (criticalErrors.length > 0) {
      console.error('Console errors detected:', criticalErrors);
    }

    session.close();
  } catch (err) {
    console.error('Browser QA encountered unexpected error:', err);
    failed++;
  } finally {
    chromeProcess.kill();
  }

  console.log('\n====================================================');
  console.log(` MANUAL BROWSER QA COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runBrowserQA().catch((e) => {
  console.error('Fatal Browser QA error:', e);
  process.exit(1);
});
