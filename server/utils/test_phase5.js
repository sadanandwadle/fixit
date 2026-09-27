// server/utils/test_phase5.js
// Automated verification script for FIXIT Phase 5:
// In-App Notification System (MongoDB-backed, canonical isRead/readAt, event integration, security)

const BASE_URL = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   STARTING FIXIT PHASE 5 AUTOMATED VERIFICATION   ');
  console.log('         (In-App Notification Architecture)        ');
  console.log('====================================================\n');

  let serverInstance = null;
  try {
    const ping = await req('/health').catch(() => null);
    if (!ping || ping.status !== 200) {
      console.log('Backend not running, auto-starting server on port 5000...');
      const path = require('path');
      require('dotenv').config({ path: path.join(__dirname, '../.env') });
      const app = require('../app');
      const connectDB = require('../config/db');
      await connectDB();
      serverInstance = await new Promise((resolve) => {
        const s = app.listen(5000, () => resolve(s));
      });
      console.log('Server started successfully on port 5000.\n');
    }
  } catch (err) {
    console.error('Failed to auto-start server:', err);
  }

  const timestamp = Date.now();
  const testProviderEmail = `pro_p5_${timestamp}@fixit.com`;
  const testCustomer1Email = `cust1_p5_${timestamp}@fixit.com`;
  const testCustomer2Email = `cust2_p5_${timestamp}@fixit.com`;
  const password = 'Password@123';

  // Step 1: Health Check
  console.log('Step 1: Checking backend health & DB connection...');
  const health = await req('/health');
  assert(health.status === 200, 'Health endpoint responds with 200 OK');
  assert(health.data.database && health.data.database.connected === true, 'Database state is connected to real MongoDB');

  // Fetch Service Catalog
  const servicesRes = await req('/services');
  assert(servicesRes.status === 200 && servicesRes.data.data.length > 0, 'Found available services in catalog');
  const service = servicesRes.data.data[0];
  const serviceId = service._id;

  // Step 2: Register Provider
  console.log('\nStep 2: Registering Provider...');
  const regProv = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'P5 Specialist Rahul',
      email: testProviderEmail,
      phone: '9876500501',
      password,
      role: 'provider',
      businessName: 'Phase 5 Elite Services',
      category: service.category || 'Electrician',
    }),
  });
  assert(regProv.status === 201, 'Provider registered successfully');
  const providerToken = regProv.data.token;
  const providerId = regProv.data.provider._id;
  const providerUserId = regProv.data.user.id || regProv.data.user._id;

  // Set provider availability for 7 days
  const availDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const schedules = availDays.map((day) => ({
    day,
    isAvailable: true,
    startTime: '08:00',
    endTime: '20:00',
  }));
  await req('/availability/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ schedules }),
  });

  // Step 3: Register Customer 1 & Customer 2
  console.log('\nStep 3: Registering Customer 1 and Customer 2...');
  const regCust1 = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'P5 Customer Alice',
      email: testCustomer1Email,
      phone: '9876500502',
      password,
      role: 'customer',
      city: 'Delhi',
    }),
  });
  assert(regCust1.status === 201, 'Customer 1 registered successfully');
  const customer1Token = regCust1.data.token;
  const customer1Id = regCust1.data.user.id || regCust1.data.user._id;

  const regCust2 = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'P5 Customer Bob',
      email: testCustomer2Email,
      phone: '9876500503',
      password,
      role: 'customer',
      city: 'Delhi',
    }),
  });
  assert(regCust2.status === 201, 'Customer 2 registered successfully');
  const customer2Token = regCust2.data.token;
  const customer2Id = regCust2.data.user.id || regCust2.data.user._id;

  // ====================================================
  // NOTIFICATION API TESTS (Specs 1–9)
  // ====================================================
  console.log('\n--- TESTING NOTIFICATION API (Specs 1-9) ---');

  // Spec 1: Authenticated user can get own notifications
  const c1NotifsInit = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(c1NotifsInit.status === 200, 'Spec 1: Authenticated user can get own notifications (200 OK)');
  assert(c1NotifsInit.data.success === true && Array.isArray(c1NotifsInit.data.notifications), 'Spec 1: Returns notifications array');

  // Spec 2: Unauthenticated user cannot get notifications
  const unauthNotifs = await req('/notifications');
  assert(unauthNotifs.status === 401, 'Spec 2: Unauthenticated user cannot get notifications (401 Unauthorized)');

  // Spec 4: Unread count endpoint
  const c1CountInit = await req('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(c1CountInit.status === 200, 'Spec 4: Unread count endpoint responds 200 OK');
  assert(typeof c1CountInit.data.count === 'number', 'Spec 4: Returns numeric unread count');

  // ====================================================
  // BOOKING NOTIFICATIONS TESTS (Specs 10–15)
  // ====================================================
  console.log('\n--- TESTING BOOKING NOTIFICATIONS (Specs 10-15) ---');

  // Spec 15: Failed booking does not create a notification
  const failedBooking = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: '2020-01-01', // Past date!
      scheduledTime: '10:00 AM',
      address: { street: '123 Test St', city: 'Delhi' },
    }),
  });
  assert(failedBooking.status === 400, 'Spec 15: Invalid booking rejected with 400 Bad Request');
  const provNotifsAfterFail = await req('/notifications', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(provNotifsAfterFail.data.notifications.length === 0, 'Spec 15: Failed booking does NOT create a notification');

  // Spec 10: Booking creation notifies provider
  const bookingDate = new Date();
  bookingDate.setDate(bookingDate.getDate() + 7);
  const bookingDateStr = bookingDate.toISOString().split('T')[0];

  const createBookingRes = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: bookingDateStr,
      scheduledTime: '11:00 AM',
      address: { street: '404 Connaught Place', city: 'Delhi' },
      price: 599,
      description: 'AC Servicing request',
    }),
  });
  assert(createBookingRes.status === 201, 'Booking 1 created successfully');
  const booking1Id = createBookingRes.data.data._id;

  const provNotifsAfterBook = await req('/notifications', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(provNotifsAfterBook.status === 200, 'Provider fetched notifications');
  const bookingCreatedNotif = provNotifsAfterBook.data.notifications.find(
    (n) => n.type === 'booking_created' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(Boolean(bookingCreatedNotif), 'Spec 10: Booking creation notified provider with booking_created type');
  assert(bookingCreatedNotif.title === 'New Booking Request', 'Spec 10: Notification has correct title "New Booking Request"');
  assert(bookingCreatedNotif.isRead === false && bookingCreatedNotif.readAt === null, 'Spec 10: Notification initialized with isRead=false, readAt=null');

  // Spec 11: Booking acceptance notifies customer
  const acceptRes = await req(`/bookings/${booking1Id}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(acceptRes.status === 200, 'Provider accepted Booking 1');

  const cust1NotifsAfterAccept = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const bookingAcceptedNotif = cust1NotifsAfterAccept.data.notifications.find(
    (n) => n.type === 'booking_accepted' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(Boolean(bookingAcceptedNotif), 'Spec 11: Booking acceptance notified customer with booking_accepted type');
  assert(bookingAcceptedNotif.title === 'Booking Accepted', 'Spec 11: Notification title is "Booking Accepted"');

  // Spec 12: Booking rejection notifies customer
  const booking2Date = new Date();
  booking2Date.setDate(booking2Date.getDate() + 8);
  const createBooking2 = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: booking2Date.toISOString().split('T')[0],
      scheduledTime: '02:00 PM',
      address: { street: '500 Nehru Place', city: 'Delhi' },
      price: 599,
    }),
  });
  const booking2Id = createBooking2.data.data._id;
  const rejectRes = await req(`/bookings/${booking2Id}/reject`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(rejectRes.status === 200, 'Provider rejected Booking 2');

  const cust1NotifsAfterReject = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const bookingRejectedNotif = cust1NotifsAfterReject.data.notifications.find(
    (n) => n.type === 'booking_rejected' && String(n.bookingId?._id || n.bookingId) === booking2Id
  );
  assert(Boolean(bookingRejectedNotif), 'Spec 12: Booking rejection notified customer with booking_rejected type');
  assert(bookingRejectedNotif.title === 'Booking Rejected', 'Spec 12: Notification title is "Booking Rejected"');

  // Spec 14: Booking cancellation notifies affected party
  const booking3Date = new Date();
  booking3Date.setDate(booking3Date.getDate() + 9);
  const createBooking3 = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: booking3Date.toISOString().split('T')[0],
      scheduledTime: '03:00 PM',
      address: { street: '600 Saket', city: 'Delhi' },
      price: 599,
    }),
  });
  const booking3Id = createBooking3.data.data._id;
  const cancelRes = await req(`/bookings/${booking3Id}/cancel`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(cancelRes.status === 200, 'Customer cancelled Booking 3');

  const provNotifsAfterCancel = await req('/notifications', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const bookingCancelledNotif = provNotifsAfterCancel.data.notifications.find(
    (n) => n.type === 'booking_cancelled' && String(n.bookingId?._id || n.bookingId) === booking3Id
  );
  assert(Boolean(bookingCancelledNotif), 'Spec 14: Booking cancellation notified provider with booking_cancelled type');
  assert(bookingCancelledNotif.title === 'Booking Cancelled', 'Spec 14: Notification title is "Booking Cancelled"');

  // ====================================================
  // OTP & SERVICE LIFECYCLE NOTIFICATIONS (Specs 13, 16–21)
  // ====================================================
  console.log('\n--- TESTING OTP & SERVICE LIFECYCLE NOTIFICATIONS (Specs 13, 16-21) ---');

  // Spec 13 & 16: Confirm booking generates OTP & notifies both parties
  const confirmRes = await req(`/bookings/${booking1Id}/confirm`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(confirmRes.status === 200, 'Customer confirmed Booking 1');
  const generatedOtp = confirmRes.data.data.otp;
  assert(Boolean(generatedOtp) && generatedOtp.length === 4, 'Service OTP generated');

  // Check Provider receives booking_confirmed (Spec 13)
  const provNotifsAfterConfirm = await req('/notifications', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const provConfirmedNotif = provNotifsAfterConfirm.data.notifications.find(
    (n) => n.type === 'booking_confirmed' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(Boolean(provConfirmedNotif), 'Spec 13: Booking confirmation notified provider with booking_confirmed');

  // Check Provider does NOT receive OTP notification (Spec 18)
  const provOtpNotifs = provNotifsAfterConfirm.data.notifications.filter((n) => n.type === 'otp_generated');
  assert(provOtpNotifs.length === 0, 'Spec 18: Provider does NOT receive OTP notification');

  // Check Customer receives otp_generated (Spec 16)
  const cust1NotifsAfterConfirm = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const custOtpNotif = cust1NotifsAfterConfirm.data.notifications.find(
    (n) => n.type === 'otp_generated' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(Boolean(custOtpNotif), 'Spec 16: OTP generation notified customer with otp_generated type');

  // Spec 17: OTP value is NOT stored in notification text or notification doc
  assert(!custOtpNotif.message.includes(generatedOtp), 'Spec 17: OTP value is NOT stored in notification message');
  assert(!custOtpNotif.otp && !custOtpNotif.otpHash, 'Spec 17: Notification document has no OTP or otpHash fields');

  // Spec 20: Invalid OTP does not create service-started notification
  const invalidOtpRes = await req(`/bookings/${booking1Id}/verify-otp`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ otp: '0000' }),
  });
  assert(invalidOtpRes.status === 400, 'Invalid OTP attempt correctly rejected');
  const custNotifsAfterBadOtp = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const badStartNotif = custNotifsAfterBadOtp.data.notifications.find(
    (n) => n.type === 'service_started' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(!badStartNotif, 'Spec 20: Invalid OTP does NOT create service_started notification');

  // Spec 19: Successful OTP verification creates service-started notification
  const validOtpRes = await req(`/bookings/${booking1Id}/verify-otp`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ otp: generatedOtp }),
  });
  assert(validOtpRes.status === 200, 'Valid OTP verified; service transitioned to in-progress');

  const custNotifsAfterGoodOtp = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const goodStartNotif = custNotifsAfterGoodOtp.data.notifications.find(
    (n) => n.type === 'service_started' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(Boolean(goodStartNotif), 'Spec 19: Successful OTP verification creates service_started notification');
  assert(goodStartNotif.title === 'Service Started', 'Spec 19: Notification title is "Service Started"');

  // Spec 21 & 22: Service completion creates customer notification & payment_due
  const completeRes = await req(`/bookings/${booking1Id}/complete`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(completeRes.status === 200, 'Provider completed Booking 1');

  const custNotifsAfterComplete = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const serviceCompletedNotif = custNotifsAfterComplete.data.notifications.find(
    (n) => n.type === 'service_completed' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(Boolean(serviceCompletedNotif), 'Spec 21: Service completion creates service_completed notification');

  const paymentDueNotif = custNotifsAfterComplete.data.notifications.find(
    (n) => n.type === 'payment_due' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(Boolean(paymentDueNotif), 'Spec 22: Completed booking creates payment_due notification');
  assert(paymentDueNotif.message.includes('Demo payment') || paymentDueNotif.message.includes('demo payment'), 'Spec 22: payment_due clearly mentions demo payment');

  // ====================================================
  // PAYMENT NOTIFICATIONS (Specs 23–27)
  // ====================================================
  console.log('\n--- TESTING PAYMENT NOTIFICATIONS (Specs 23-27) ---');

  // Initialize demo payment
  const createPaymentRes = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: booking1Id, method: 'upi' }),
  });
  assert(createPaymentRes.status === 201, 'Demo payment record initialized');
  const payment1Id = createPaymentRes.data.payment.paymentId;

  // Spec 25 & 26: Failed demo payment creates payment_failed (and NOT payment_success)
  const failPaymentRes = await req(`/payments/${payment1Id}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ method: 'upi', upiId: 'fail@upi' }),
  });
  assert(failPaymentRes.status === 400, 'Simulated payment failure triggered');

  const custNotifsAfterPayFail = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const payFailedNotif = custNotifsAfterPayFail.data.notifications.find(
    (n) => n.type === 'payment_failed' && String(n.paymentId?._id || n.paymentId) === payment1Id
  );
  assert(Boolean(payFailedNotif), 'Spec 25: Failed demo payment creates customer payment_failed notification');
  assert(payFailedNotif.title === 'Payment Failed', 'Spec 25: Title is "Payment Failed"');

  const prematureSuccessNotif = custNotifsAfterPayFail.data.notifications.find(
    (n) => n.type === 'payment_success' && String(n.paymentId?._id || n.paymentId) === payment1Id
  );
  assert(!prematureSuccessNotif, 'Spec 26: Payment failure does NOT create payment_success notification');

  // Spec 23 & 24: Successful demo payment notifies Customer & Provider
  // Re-initialize payment for retry
  const retryPayRes = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: booking1Id, method: 'upi' }),
  });
  const retryPaymentId = retryPayRes.data.payment.paymentId;

  const successPaymentRes = await req(`/payments/${retryPaymentId}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ method: 'upi', upiId: 'alice@okhdfcbank' }),
  });
  assert(successPaymentRes.status === 200, 'Demo payment processed successfully');
  const txnId = successPaymentRes.data.payment.transactionId;

  const custNotifsAfterPaySuccess = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const custPaySuccessNotif = custNotifsAfterPaySuccess.data.notifications.find(
    (n) => n.type === 'payment_success' && String(n.paymentId?._id || n.paymentId) === retryPaymentId
  );
  assert(Boolean(custPaySuccessNotif), 'Spec 23: Successful demo payment creates customer payment_success notification');
  assert(custPaySuccessNotif.message.includes(txnId), 'Spec 23: Customer notification contains transactionId');

  const provNotifsAfterPaySuccess = await req('/notifications', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const provPaySuccessNotif = provNotifsAfterPaySuccess.data.notifications.find(
    (n) => n.type === 'payment_success' && String(n.paymentId?._id || n.paymentId) === retryPaymentId
  );
  assert(Boolean(provPaySuccessNotif), 'Spec 24: Successful demo payment creates provider payment_success notification');

  // Spec 27: Duplicate payment processing prevention
  const dupPayAttempt = await req(`/payments/${retryPaymentId}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ method: 'upi', upiId: 'alice@okhdfcbank' }),
  });
  assert(dupPayAttempt.status === 409 || dupPayAttempt.status === 400, 'Duplicate payment processing rejected');

  const custNotifsAfterDupPay = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const allSuccessNotifsForPayment = custNotifsAfterDupPay.data.notifications.filter(
    (n) => n.type === 'payment_success' && String(n.paymentId?._id || n.paymentId) === retryPaymentId
  );
  assert(allSuccessNotifsForPayment.length === 1, 'Spec 27: Duplicate payment processing does NOT create duplicate success notifications');

  // ====================================================
  // REVIEW NOTIFICATIONS (Specs 28–29)
  // ====================================================
  console.log('\n--- TESTING REVIEW NOTIFICATIONS (Specs 28-29) ---');

  // Spec 29: Failed review creation does not notify provider
  const invalidReviewRes = await req('/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      bookingId: booking1Id,
      rating: 10, // Invalid rating > 5!
      comment: 'Super service',
    }),
  });
  assert(invalidReviewRes.status === 400, 'Invalid review correctly rejected (400 Bad Request)');
  const provNotifsAfterBadReview = await req('/notifications', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const badReviewNotif = provNotifsAfterBadReview.data.notifications.find(
    (n) => n.type === 'review_received' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(!badReviewNotif, 'Spec 29: Failed review creation does NOT notify provider');

  // Spec 28: Successful review creation notifies provider
  const validReviewRes = await req('/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      bookingId: booking1Id,
      rating: 5,
      comment: 'Excellent AC servicing! Very professional.',
    }),
  });
  assert(validReviewRes.status === 201, 'Review submitted successfully');

  const provNotifsAfterGoodReview = await req('/notifications', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const goodReviewNotif = provNotifsAfterGoodReview.data.notifications.find(
    (n) => n.type === 'review_received' && String(n.bookingId?._id || n.bookingId) === booking1Id
  );
  assert(Boolean(goodReviewNotif), 'Spec 28: Successful review creation notifies provider with review_received');
  assert(goodReviewNotif.title === 'New Review', 'Spec 28: Title is "New Review"');

  // ====================================================
  // READ STATUS & AUTHORIZATION TESTS (Specs 3, 5–8, 9, 30–32)
  // ====================================================
  console.log('\n--- TESTING NOTIFICATION READ STATUS & SECURITY (Specs 3, 5-8, 9, 30-32) ---');

  // Spec 3 & 30: User cannot retrieve another user's notifications & ownership enforced
  const cust2Notifs = await req('/notifications', {
    headers: { Authorization: `Bearer ${customer2Token}` },
  });
  assert(cust2Notifs.status === 200, 'Customer 2 fetched own notifications');
  assert(cust2Notifs.data.notifications.length === 0, 'Spec 3 & 30: Customer 2 cannot see Customer 1 or Provider notifications');

  // Spec 4: Unread count accuracy
  const unreadCountRes = await req('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const unreadCountBefore = unreadCountRes.data.count;
  assert(unreadCountBefore > 0, `Spec 4: Accurate unread count verified (${unreadCountBefore} unread)`);

  // Spec 5: User can mark own notification as read
  const notifToRead = custNotifsAfterPaySuccess.data.notifications[0];
  const readRes = await req(`/notifications/${notifToRead._id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(readRes.status === 200, 'Spec 5: User can mark own notification as read (200 OK)');
  assert(readRes.data.notification.isRead === true, 'Spec 5: Notification isRead is true');
  assert(Boolean(readRes.data.notification.readAt), 'Spec 5: readAt timestamp is populated');

  // Verify unread count decreased by 1
  const unreadCountAfterOne = await req('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(unreadCountAfterOne.data.count === unreadCountBefore - 1, 'Spec 5: Unread count decremented by 1');

  // Spec 6: User cannot mark another user's notification as read
  const crossUserRead = await req(`/notifications/${notifToRead._id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer2Token}` },
  });
  assert(crossUserRead.status === 403, 'Spec 6: User cannot mark another user notification as read (403 Forbidden)');

  // Spec 7: User can mark all own notifications as read
  const markAllRes = await req('/notifications/read-all', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(markAllRes.status === 200, 'Spec 7: User can mark all own notifications as read (200 OK)');
  assert(typeof markAllRes.data.updatedCount === 'number', 'Spec 7: Returns updatedCount');

  const unreadCountAfterAll = await req('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(unreadCountAfterAll.data.count === 0, 'Spec 7: Unread count is now 0');

  // Spec 8: Mark-all does not affect another user's notifications
  const provUnreadCount = await req('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(provUnreadCount.data.count > 0, 'Spec 8: Provider unread notifications untouched by customer mark-all');

  // Spec 9: Pagination works
  const paginatedRes = await req('/notifications?page=1&limit=2', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(paginatedRes.status === 200, 'Spec 9: Pagination endpoint responds 200 OK');
  assert(paginatedRes.data.notifications.length <= 2, 'Spec 9: Limit enforced (<= 2 items returned)');
  assert(paginatedRes.data.pagination && paginatedRes.data.pagination.limit === 2, 'Spec 9: Pagination metadata returns limit=2');
  assert(paginatedRes.data.pagination.pages >= 1, 'Spec 9: Pagination metadata returns total pages');

  // Spec 31: Recipient cannot be spoofed via client
  // Even if a user attempts to fetch or tamper with notifications, recipientId is derived strictly from req.user._id
  const spoofAttempt = await req('/notifications?recipientId=fake_spoofed_id', {
    headers: { Authorization: `Bearer ${customer2Token}` },
  });
  assert(spoofAttempt.data.notifications.length === 0, 'Spec 31: Client query param recipientId cannot spoof notifications');

  // Spec 32: Sensitive OTP/payment data is not included
  const allProvNotifs = await req('/notifications?limit=100', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const allCustNotifs = await req('/notifications?limit=100', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const combined = [...allProvNotifs.data.notifications, ...allCustNotifs.data.notifications];
  let leakFound = false;
  for (const n of combined) {
    const msg = n.message || '';
    if (msg.includes('Password') || msg.includes('cvv') || msg.includes('card') || msg.includes('secret')) {
      leakFound = true;
    }
    if (n.otp || n.otpHash || n.password || n.token) {
      leakFound = true;
    }
  }
  assert(!leakFound, 'Spec 32: No sensitive credentials, passwords, tokens, or OTP hashes exposed');

  console.log('\n====================================================');
  console.log(` PHASE 5 VERIFICATION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (serverInstance) {
    serverInstance.close();
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
