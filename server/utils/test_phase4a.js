// server/utils/test_phase4a.js
// Automated verification script for FIXIT Phase 4A:
// Internal Simulated Payment System (No Real Payment Gateways)

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
  console.log('   STARTING FIXIT PHASE 4A AUTOMATED VERIFICATION   ');
  console.log('       (Simulated Internal Payment Architecture)    ');
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
  const testProviderEmail = `pro_p4_${timestamp}@fixit.com`;
  const testCustomer1Email = `cust1_p4_${timestamp}@fixit.com`;
  const testCustomer2Email = `cust2_p4_${timestamp}@fixit.com`;
  const password = 'Password@123';

  // 1. Health check
  console.log('Step 1: Checking backend health & DB connection...');
  const health = await req('/health');
  assert(health.status === 200, 'Health endpoint responds with 200 OK');
  assert(health.data.database && health.data.database.connected === true, 'Database state is connected to real MongoDB');

  // Fetch a seeded service
  const servicesRes = await req('/services');
  assert(servicesRes.status === 200 && servicesRes.data.data.length > 0, 'Found available services in catalog');
  const service = servicesRes.data.data[0];
  const serviceId = service._id;
  const standardPrice = service.basePrice || 399;

  // 2. Register Provider
  console.log('\nStep 2: Registering Provider...');
  const regProv = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'P4 Pro Specialist',
      email: testProviderEmail,
      phone: '9876500004',
      password,
      role: 'provider',
      businessName: 'Phase 4 Premier Services',
      category: service.category || 'Electrician',
    }),
  });
  assert(regProv.status === 201, 'Provider registered successfully');
  const providerToken = regProv.data.token;
  const providerId = regProv.data.provider._id;

  // 3. Register Customer 1 & Customer 2
  console.log('\nStep 3: Registering Customer 1 and Customer 2...');
  const regCust1 = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'P4 Customer Alice',
      email: testCustomer1Email,
      phone: '9876500001',
      password,
      role: 'customer',
      city: 'Mumbai',
    }),
  });
  assert(regCust1.status === 201, 'Customer 1 registered successfully');
  const customer1Token = regCust1.data.token;
  const customer1Id = regCust1.data.user.id;

  const regCust2 = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'P4 Customer Bob',
      email: testCustomer2Email,
      phone: '9876500002',
      password,
      role: 'customer',
      city: 'Mumbai',
    }),
  });
  assert(regCust2.status === 201, 'Customer 2 registered successfully');
  const customer2Token = regCust2.data.token;

  // 4. Create Bookings in various lifecycle states to test Payment Creation guards
  console.log('\nStep 4: Setting up test bookings across lifecycle states...');
  
  // Future dates helper
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const futureDate = d.toISOString();

  // Booking A: Pending
  const bPendingRes = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: futureDate,
      scheduledTime: '10:00 AM',
      price: standardPrice,
      address: { street: '123 Test St', city: 'Mumbai' },
    }),
  });
  assert(bPendingRes.status === 201, 'Booking A (pending) created');
  const bookingPendingId = bPendingRes.data.data._id;

  // Booking B: Accepted
  d.setDate(d.getDate() + 1);
  const bAcceptedRes = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: d.toISOString(),
      scheduledTime: '11:00 AM',
      price: standardPrice,
      address: { street: '123 Test St', city: 'Mumbai' },
    }),
  });
  const bookingAcceptedId = bAcceptedRes.data.data._id;
  await req(`/bookings/${bookingAcceptedId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });

  // Booking C: Confirmed
  d.setDate(d.getDate() + 1);
  const bConfirmedRes = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: d.toISOString(),
      scheduledTime: '12:00 PM',
      price: standardPrice,
      address: { street: '123 Test St', city: 'Mumbai' },
    }),
  });
  const bookingConfirmedId = bConfirmedRes.data.data._id;
  await req(`/bookings/${bookingConfirmedId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const confirmRes = await req(`/bookings/${bookingConfirmedId}/confirm`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const otpCode = confirmRes.data.otp;

  // Booking D: In-Progress
  d.setDate(d.getDate() + 1);
  const bInProgRes = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: d.toISOString(),
      scheduledTime: '01:00 PM',
      price: standardPrice,
      address: { street: '123 Test St', city: 'Mumbai' },
    }),
  });
  const bookingInProgId = bInProgRes.data.data._id;
  await req(`/bookings/${bookingInProgId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const confInProgRes = await req(`/bookings/${bookingInProgId}/confirm`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const otpInProg = confInProgRes.data?.data?.otp || confInProgRes.data?.otp;
  await req(`/bookings/${bookingInProgId}/verify-otp`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ otp: otpInProg }),
  });

  // Booking E: Cancelled
  d.setDate(d.getDate() + 1);
  const bCancelledRes = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: d.toISOString(),
      scheduledTime: '02:00 PM',
      price: standardPrice,
      address: { street: '123 Test St', city: 'Mumbai' },
    }),
  });
  const bookingCancelledId = bCancelledRes.data.data._id;
  await req(`/bookings/${bookingCancelledId}/cancel`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });

  // Booking F: Rejected
  d.setDate(d.getDate() + 1);
  const bRejectedRes = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: d.toISOString(),
      scheduledTime: '03:00 PM',
      price: standardPrice,
      address: { street: '123 Test St', city: 'Mumbai' },
    }),
  });
  const bookingRejectedId = bRejectedRes.data.data._id;
  await req(`/bookings/${bookingRejectedId}/reject`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ reason: 'Overbooked' }),
  });

  // Booking G: Fully Completed
  d.setDate(d.getDate() + 1);
  const bCompletedRes = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: d.toISOString(),
      scheduledTime: '04:00 PM',
      price: standardPrice,
      address: { street: '123 Test St', city: 'Mumbai' },
    }),
  });
  const bookingCompletedId = bCompletedRes.data.data._id;
  await req(`/bookings/${bookingCompletedId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const confCompRes = await req(`/bookings/${bookingCompletedId}/confirm`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const otpComp = confCompRes.data?.data?.otp || confCompRes.data?.otp;
  await req(`/bookings/${bookingCompletedId}/verify-otp`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ otp: otpComp }),
  });
  await req(`/bookings/${bookingCompletedId}/complete`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });

  // ==========================================
  // SPEC 1-7: PAYMENT CREATION STATE GUARDS
  // ==========================================
  console.log('\n--- TESTING SPEC 1-7: Payment Creation State Machine Guards ---');

  // Spec 2: Pending booking cannot create payment
  const pPending = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingPendingId }),
  });
  assert(pPending.status === 400, 'Pending booking cannot create payment (400 Bad Request)');

  // Spec 3: Accepted booking cannot create payment
  const pAccepted = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingAcceptedId }),
  });
  assert(pAccepted.status === 400, 'Accepted booking cannot create payment (400 Bad Request)');

  // Spec 4: Confirmed booking cannot create payment
  const pConfirmed = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingConfirmedId }),
  });
  assert(pConfirmed.status === 400, 'Confirmed booking cannot create payment (400 Bad Request)');

  // Spec 5: In-progress booking cannot create payment
  const pInProg = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingInProgId }),
  });
  assert(pInProg.status === 400, 'In-progress booking cannot create payment (400 Bad Request)');

  // Spec 6: Cancelled booking cannot create payment
  const pCancelled = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingCancelledId }),
  });
  assert(pCancelled.status === 400, 'Cancelled booking cannot create payment (400 Bad Request)');

  // Spec 7: Rejected booking cannot create payment
  const pRejected = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingRejectedId }),
  });
  assert(pRejected.status === 400, 'Rejected booking cannot create payment (400 Bad Request)');

  // Spec 1: Completed booking CAN create payment
  const pCompleted = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingCompletedId }),
  });
  assert(pCompleted.status === 201, 'Completed booking successfully creates payment (201 Created)');
  assert(pCompleted.data.payment && pCompleted.data.payment.status === 'pending', 'Payment initialized with status pending');
  const paymentRecordId = pCompleted.data.payment.paymentId;

  // ==========================================
  // SPEC 8-10: AUTHORIZATION GUARDS
  // ==========================================
  console.log('\n--- TESTING SPEC 8-10: Authorization Guards ---');

  // Spec 8: Customer cannot pay another customer's booking
  const pCrossCustomer = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer2Token}` }, // Customer 2 attempts on Customer 1's booking
    body: JSON.stringify({ bookingId: bookingCompletedId }),
  });
  assert(pCrossCustomer.status === 403, 'Customer 2 blocked from Customer 1 booking (403 Forbidden)');

  // Spec 9: Provider cannot create customer payment
  const pProviderAttempt = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ bookingId: bookingCompletedId }),
  });
  assert(pProviderAttempt.status === 403, 'Provider blocked from customer payment creation (403 Forbidden)');

  // Spec 10: Unauthenticated user cannot create payment
  const pUnauthAttempt = await req('/payments/create', {
    method: 'POST',
    body: JSON.stringify({ bookingId: bookingCompletedId }),
  });
  assert(pUnauthAttempt.status === 401, 'Unauthenticated user blocked from payment creation (401 Unauthorized)');

  // ==========================================
  // SPEC 11-14: AMOUNT INTEGRITY & SECURITY
  // ==========================================
  console.log('\n--- TESTING SPEC 11-14: Amount Integrity & Security ---');

  // Spec 11: Backend determines correct authoritative amount from booking
  assert(pCompleted.data.payment.amount === standardPrice, `Backend determined authoritative amount: ₹${standardPrice}`);

  // Spec 12: Frontend cannot override amount (e.g. attempting to send ₹1)
  const pOverrideAttempt = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      bookingId: bookingCompletedId,
      amount: 1, // Malicious client attempt to pay 1 rupee
    }),
  });
  assert(pOverrideAttempt.status === 201, 'Request handled safely');
  assert(pOverrideAttempt.data.payment.amount === standardPrice, 'Frontend amount override IGNORED; authoritative price preserved');

  // Spec 13 & 14: Model validation for positive amount
  const Payment = require('../models/Payment');
  const invalidPayment = new Payment({
    bookingId: bookingCompletedId,
    customerId: customer1Id,
    providerId,
    amount: -100, // Negative amount
  });
  const validationError = invalidPayment.validateSync();
  assert(validationError && validationError.errors['amount'], 'Payment model rejects negative amount');

  const zeroPayment = new Payment({
    bookingId: bookingCompletedId,
    customerId: customer1Id,
    providerId,
    amount: 0, // Zero amount
  });
  const zeroValidationError = zeroPayment.validateSync();
  assert(zeroValidationError && zeroValidationError.errors['amount'], 'Payment model rejects zero amount');

  // ==========================================
  // SPEC 15-18: PROCESSING & SIMULATION & RETRY (Sections 4, 5, 12, 16)
  // ==========================================
  console.log('\n--- TESTING SPEC 15-18: Payment Processing, Failure Simulation & Retry ---');

  // Spec 16: Failed demo payment transitions pending -> processing -> failed
  const pFailAttempt = await req(`/payments/${paymentRecordId}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      method: 'upi',
      upiId: 'fail@upi',
      simulateFailure: true,
    }),
  });
  assert(pFailAttempt.status === 400, 'Simulated failure returns 400 Bad Request');
  assert(pFailAttempt.data.payment.status === 'failed', 'Payment status recorded as failed in DB');
  assert(pFailAttempt.data.payment.paidAt === null, 'failed payment paidAt is null');
  assert(pFailAttempt.data.payment.transactionId === null, 'failed payment transactionId is null');

  // Verify booking reflects failed status
  const bAfterFail = await req(`/bookings/${bookingCompletedId}`, {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(bAfterFail.data.data.paymentStatus === 'failed', 'Booking paymentStatus updated to failed');

  // Section 4 & 5: Invalid transition: failed -> paid is rejected!
  const pFailToProcess = await req(`/payments/${paymentRecordId}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ method: 'upi', upiId: 'alice@okaxis' }),
  });
  assert(pFailToProcess.status === 400, 'Invalid transition: failed -> paid is REJECTED (400 Bad Request)');

  // Section 5: Payment Retry creates a new payment attempt while preserving failed record
  const pRetryCreate = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingCompletedId }),
  });
  assert(pRetryCreate.status === 201, 'Payment retry successfully initializes a new payment attempt (201 Created)');
  const newPaymentId = pRetryCreate.data.payment.id || pRetryCreate.data.payment.paymentId;
  assert(newPaymentId !== paymentRecordId, 'New payment attempt has distinct ID preserving failed record');
  assert(pRetryCreate.data.payment.status === 'pending', 'New payment attempt status is pending');

  // Spec 15: Valid payment succeeds (pending -> processing -> paid)
  const pSuccessAttempt = await req(`/payments/${newPaymentId}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      method: 'upi',
      upiId: 'alice@okaxis',
      simulateFailure: false,
    }),
  });
  assert(pSuccessAttempt.status === 200, 'Valid demo payment processed successfully (200 OK)');
  assert(pSuccessAttempt.data.payment.status === 'paid', 'Payment status transitioned to paid');
  assert(pSuccessAttempt.data.payment.paidAt !== null, 'paidAt timestamp recorded for paid payment');

  // Spec 18: Unique transaction ID generated
  const txnId = pSuccessAttempt.data.payment.transactionId;
  assert(typeof txnId === 'string' && txnId.startsWith('FIXIT-TXN-'), `Generated unique transaction ID: ${txnId}`);

  // ==========================================
  // INVALID STATE TRANSITION GUARDS (Section 4 & 13)
  // ==========================================
  console.log('\n--- TESTING INVALID STATE TRANSITION GUARDS (paid -> *, failed -> *, cancelled -> *) ---');

  // paid -> pending (Duplicate create on paid booking)
  const pPaidToPending = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingCompletedId }),
  });
  assert(pPaidToPending.status === 409 || pPaidToPending.status === 400, 'paid -> pending is REJECTED (409 Conflict)');

  // paid -> processing / paid -> paid (Duplicate process)
  const pPaidToProcess = await req(`/payments/${newPaymentId}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ method: 'card' }),
  });
  assert(pPaidToProcess.status === 409 || pPaidToProcess.status === 400, 'paid -> processing is REJECTED (409 Conflict)');

  // paid -> failed (Cannot fail already paid payment)
  const pPaidToFail = await req(`/payments/${newPaymentId}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ method: 'card', simulateFailure: true }),
  });
  assert(pPaidToFail.status === 409 || pPaidToFail.status === 400, 'paid -> failed is REJECTED (409 Conflict)');

  // paid -> cancelled (Cannot cancel already paid payment)
  const pPaidToCancel = await req(`/payments/${newPaymentId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(pPaidToCancel.status === 400, 'paid -> cancelled is REJECTED (400 Bad Request)');

  // ==========================================
  // CANCELLATION FLOW & CANCELLED -> PAID GUARD
  // ==========================================
  console.log('\n--- TESTING CANCELLATION & cancelled -> paid REJECTION ---');
  // Setup Booking H: Completed booking for cancellation test
  d.setDate(d.getDate() + 1);
  const bCancelFlowRes = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: d.toISOString(),
      scheduledTime: '05:00 PM',
      price: standardPrice,
      address: { street: '456 Cancel Ave', city: 'Mumbai' },
    }),
  });
  const bookingHId = bCancelFlowRes.data.data._id;
  await req(`/bookings/${bookingHId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const confHRes = await req(`/bookings/${bookingHId}/confirm`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  const otpH = confHRes.data?.data?.otp || confHRes.data?.otp;
  await req(`/bookings/${bookingHId}/verify-otp`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ otp: otpH }),
  });
  await req(`/bookings/${bookingHId}/complete`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });

  // Customer creates payment for Booking H (pending)
  const pCreateH = await req('/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ bookingId: bookingHId }),
  });
  assert(pCreateH.status === 201, 'Payment for Booking H initialized as pending');
  const paymentHId = pCreateH.data.payment.id || pCreateH.data.payment.paymentId;

  // Customer cancels payment H: pending -> cancelled
  const pCancelH = await req(`/payments/${paymentHId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(pCancelH.status === 200, 'Customer successfully cancelled pending payment (pending -> cancelled)');
  assert(pCancelH.data.payment.status === 'cancelled', 'Payment status transitioned to cancelled');
  assert(pCancelH.data.payment.paidAt === null, 'cancelled payment paidAt is null');
  assert(pCancelH.data.payment.transactionId === null, 'cancelled payment transactionId is null');

  // cancelled -> paid (Cannot process a cancelled payment)
  const pCancelledToPaid = await req(`/payments/${paymentHId}/process`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer1Token}` },
    body: JSON.stringify({ method: 'upi', upiId: 'alice@okaxis' }),
  });
  assert(pCancelledToPaid.status === 400, 'Invalid transition: cancelled -> paid is REJECTED (400 Bad Request)');

  // ==========================================
  // SPEC 19-21: PAYMENT STATUS VIEW & PERMISSIONS
  // ==========================================
  console.log('\n--- TESTING SPEC 19-21: Payment Status Viewing & Permissions ---');

  // Spec 19: Customer sees correct payment status
  const pCustView = await req(`/payments/booking/${bookingCompletedId}`, {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(pCustView.status === 200, 'Customer successfully retrieved payment details');
  assert(pCustView.data.payment.status === 'paid', 'Customer sees canonical status paid');
  assert(pCustView.data.payment.transactionId === txnId, 'Customer sees correct transactionId');

  // Spec 20: Provider sees appropriate payment status for own booking
  const pProvView = await req(`/payments/booking/${bookingCompletedId}`, {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(pProvView.status === 200, 'Provider successfully retrieved payment status for assigned booking');
  assert(pProvView.data.payment.status === 'paid', 'Provider sees status paid');

  // Spec 21: Unauthorized user cannot view payment
  const pIntruderView = await req(`/payments/booking/${bookingCompletedId}`, {
    headers: { Authorization: `Bearer ${customer2Token}` },
  });
  assert(pIntruderView.status === 403, 'Intruder customer blocked from viewing foreign payment (403 Forbidden)');

  const pUnauthView = await req(`/payments/booking/${bookingCompletedId}`);
  assert(pUnauthView.status === 401, 'Unauthenticated user blocked from viewing payment (401 Unauthorized)');

  // ==========================================
  // SPEC 22: CUSTOMER PAYMENT HISTORY
  // ==========================================
  console.log('\n--- TESTING SPEC 22: Customer Payment History ---');
  const myPaymentsRes = await req('/payments/my-payments', {
    headers: { Authorization: `Bearer ${customer1Token}` },
  });
  assert(myPaymentsRes.status === 200, 'Customer fetched payment history (200 OK)');
  assert(myPaymentsRes.data.data.length >= 1, 'Payment history list contains completed payment');
  const foundPaid = myPaymentsRes.data.data.find((p) => p.transactionId === txnId);
  assert(Boolean(foundPaid), 'Payment history includes accurate transaction reference');
  assert(foundPaid.status === 'paid', 'Payment history entry has canonical status paid');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n====================================================');
  console.log(` PHASE 4A VERIFICATION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('====================================================\n');

  if (serverInstance) {
    serverInstance.close();
    const mongoose = require('mongoose');
    await mongoose.connection.close();
  }

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test script error:', err);
  process.exit(1);
});
