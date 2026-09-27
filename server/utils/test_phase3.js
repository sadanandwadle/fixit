// server/utils/test_phase3.js
// Automated verification script for FIXIT Phase 3:
// Availability + OTP Security Lifecycle + Reviews & Ratings

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
  console.log('==================================================');
  console.log('   STARTING FIXIT PHASE 3 AUTOMATED VERIFICATION  ');
  console.log('==================================================\n');

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
  const testProviderEmail = `pro_p3_${timestamp}@fixit.com`;
  const testCustomer1Email = `cust1_p3_${timestamp}@fixit.com`;
  const testCustomer2Email = `cust2_p3_${timestamp}@fixit.com`;
  const password = 'Password@123';

  // 1. Health check
  console.log('Step 1: Checking backend health & DB connection...');
  const health = await req('/health');
  assert(health.status === 200, 'Health endpoint responds with 200 OK');
  assert(health.data.database && health.data.database.connected === true, 'Database state is connected');

  // Fetch a seeded service to book with
  const servicesRes = await req('/services');
  assert(servicesRes.status === 200 && servicesRes.data.data.length > 0, 'Found available services');
  const serviceId = servicesRes.data.data[0]._id;

  // 2. Register Provider
  console.log('\nStep 2: Registering and logging in Provider...');
  const regProv = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'P3 Pro Plumber',
      email: testProviderEmail,
      password,
      role: 'provider',
      phone: '9988776655',
      businessName: 'P3 Pro Plumbing Services',
    }),
  });
  assert(regProv.status === 201, 'Provider registered successfully');
  const providerToken = regProv.data.token;
  const providerId = regProv.data.provider._id;
  assert(Boolean(providerToken), 'Provider received JWT token');
  assert(Boolean(providerId), `Provider profile auto-created with ID: ${providerId}`);

  // 3. Provider sets weekly availability
  console.log('\nStep 3: Setting provider weekly availability schedule...');
  const weeklySchedule = [
    { day: 'Monday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Tuesday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Wednesday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Thursday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Friday', isAvailable: true, startTime: '09:00', endTime: '18:00' },
    { day: 'Saturday', isAvailable: true, startTime: '10:00', endTime: '16:00' },
    { day: 'Sunday', isAvailable: false, startTime: '09:00', endTime: '17:00' },
  ];

  const updateAvail = await req('/availability/me', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ schedules: weeklySchedule }),
  });
  assert(updateAvail.status === 200, 'Provider updated weekly schedule');
  assert(Array.isArray(updateAvail.data.data) && updateAvail.data.data.length === 7, 'Stored all 7 days of schedule');

  // Verify provider get availability me
  const getMyAvail = await req('/availability/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(getMyAvail.status === 200, 'Provider retrieved own availability');

  // 4. Register Customers
  console.log('\nStep 4: Registering Customer 1 and Customer 2...');
  const regCust1 = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Alice Customer',
      email: testCustomer1Email,
      password,
      role: 'customer',
      phone: '9123456780',
    }),
  });
  assert(regCust1.status === 201, 'Customer 1 registered successfully');
  const cust1Token = regCust1.data.token;

  const regCust2 = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Bob Customer',
      email: testCustomer2Email,
      password,
      role: 'customer',
      phone: '9123456781',
    }),
  });
  assert(regCust2.status === 201, 'Customer 2 registered successfully');
  const cust2Token = regCust2.data.token;

  // 5. Customer checks public provider availability
  console.log('\nStep 5: Customer checks provider public availability...');
  const pubAvail = await req(`/availability/provider/${providerId}`, {
    method: 'GET',
  });
  assert(pubAvail.status === 200, 'Public provider availability fetched');
  assert(pubAvail.data.data.schedules.length === 7, 'Public availability contains schedule');

  const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 6. Test booking on Sunday (Provider unavailable on Sunday)
  console.log('\nStep 6: Attempting booking on Sunday (unavailable day)...');
  const now = new Date();
  const nextSunday = new Date(now);
  const daysUntilSunday = ((7 - now.getDay()) % 7) || 7;
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  const sundayStr = formatLocalDate(nextSunday);

  const sundayBooking = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cust1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: sundayStr,
      scheduledTime: '11:00 AM',
      address: {
        street: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560038',
      },
      description: 'Leaking pipe under kitchen sink',
    }),
  });
  assert(sundayBooking.status === 400, 'Booking rejected on unavailable Sunday (400 Bad Request)');

  // 7. Test valid booking on an upcoming Wednesday
  console.log('\nStep 7: Customer 1 creates valid booking on Wednesday...');
  const nextWed = new Date(now);
  const daysUntilWed = ((3 - now.getDay() + 7) % 7) || 7;
  nextWed.setDate(now.getDate() + daysUntilWed);
  const wedStr = formatLocalDate(nextWed);

  const validBooking = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cust1Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: wedStr,
      scheduledTime: '10:00 AM',
      address: {
        street: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560038',
      },
      description: 'Emergency kitchen pipe leak',
    }),
  });
  assert(validBooking.status === 201, 'Booking created successfully with status pending');
  const bookingId = validBooking.data.data._id;

  // 8. Test Double-Booking Prevention (Customer 2 tries to book same provider, same date & slot)
  console.log('\nStep 8: Testing Double-Booking Prevention (Customer 2 on same slot)...');
  const doubleBooking = await req('/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cust2Token}` },
    body: JSON.stringify({
      providerId,
      serviceId,
      scheduledDate: wedStr,
      scheduledTime: '10:00 AM',
      address: {
        street: '456 Oak Avenue',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560038',
      },
      description: 'Bathroom faucet replacement',
    }),
  });
  assert(doubleBooking.status === 409, 'Double booking rejected with 409 Conflict');

  // 9. Provider accepts booking
  console.log('\nStep 9: Provider accepts the booking...');
  const acceptRes = await req(`/bookings/${bookingId}/accept`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(acceptRes.status === 200, 'Provider accepted booking');
  assert(acceptRes.data.data.status === 'accepted', 'Booking status transitioned to accepted');

  // 10. Customer confirms booking & generates OTP
  console.log('\nStep 10: Customer confirms booking (generates OTP)...');
  const confirmRes = await req(`/bookings/${bookingId}/confirm`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${cust1Token}` },
  });
  assert(confirmRes.status === 200, 'Customer confirmed booking');
  assert(confirmRes.data.data.status === 'confirmed', 'Booking status transitioned to confirmed');
  const generatedOtp = confirmRes.data.data.otp;
  assert(typeof generatedOtp === 'string' && generatedOtp.length === 4, `Customer received 4-digit OTP: ${generatedOtp}`);

  // 11. Security Check: Provider GET booking must NOT expose the OTP
  console.log('\nStep 11: Verifying OTP masking (Provider must NOT see OTP)...');
  const provBookingView = await req(`/bookings/${bookingId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(provBookingView.status === 200, 'Provider fetched booking details');
  assert(provBookingView.data.data.otp === undefined, 'Provider response DOES NOT expose raw OTP (Properly Masked)');
  assert(provBookingView.data.data.otpHash === undefined, 'Provider response DOES NOT expose otpHash');

  // 12. Provider attempts wrong OTP verification
  console.log('\nStep 12: Provider enters WRONG OTP...');
  const wrongOtp = generatedOtp === '1234' ? '9999' : '0000';
  const wrongOtpRes = await req(`/bookings/${bookingId}/verify-otp`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ otp: wrongOtp }),
  });
  assert(wrongOtpRes.status === 400, 'Wrong OTP rejected with 400 Bad Request');

  // 13. Provider enters CORRECT OTP
  console.log('\nStep 13: Provider enters CORRECT OTP...');
  const correctOtpRes = await req(`/bookings/${bookingId}/verify-otp`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
    body: JSON.stringify({ otp: generatedOtp }),
  });
  assert(correctOtpRes.status === 200, 'Correct OTP verified successfully');
  assert(correctOtpRes.data.data.status === 'in-progress', 'Booking status transitioned to in-progress');

  // 14. Provider completes the service
  console.log('\nStep 14: Provider marks service as completed...');
  const completeRes = await req(`/bookings/${bookingId}/complete`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  assert(completeRes.status === 200, 'Service completed successfully');
  assert(completeRes.data.data.status === 'completed', 'Booking status transitioned to completed');
  assert(Boolean(completeRes.data.data.completedAt), 'completedAt timestamp recorded');

  // 15. Customer creates a Review & Rating
  console.log('\nStep 15: Customer submits review and 5-star rating...');
  const reviewRes = await req('/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cust1Token}` },
    body: JSON.stringify({
      bookingId,
      rating: 5,
      comment: 'Excellent plumbing service! Very professional and punctual.',
    }),
  });
  assert(reviewRes.status === 201, 'Review submitted successfully');
  assert(reviewRes.data.data.rating === 5, 'Rating saved as 5');

  // 16. Verify duplicate review attempt is rejected
  console.log('\nStep 16: Customer attempts duplicate review on same booking...');
  const dupReviewRes = await req('/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cust1Token}` },
    body: JSON.stringify({
      bookingId,
      rating: 4,
      comment: 'Another review attempt',
    }),
  });
  assert(dupReviewRes.status === 400, 'Duplicate review rejected with 400 Bad Request');

  // 17. Verify Provider rating and total reviews updated
  console.log('\nStep 17: Verifying provider profile recalculated rating & totalReviews...');
  const updatedProvProfile = await req(`/providers/${providerId}`, {
    method: 'GET',
  });
  assert(updatedProvProfile.status === 200, 'Fetched updated provider profile');
  assert(updatedProvProfile.data.data.rating === 5, 'Provider rating updated to 5.0');
  assert(updatedProvProfile.data.data.totalReviews === 1, 'Provider totalReviews updated to 1');

  // 18. Verify Public Provider Reviews list
  console.log('\nStep 18: Fetching provider public reviews...');
  const pubReviews = await req(`/reviews/provider/${providerId}`, {
    method: 'GET',
  });
  assert(pubReviews.status === 200, 'Public reviews fetched');
  assert(pubReviews.data.data.length >= 1, 'Reviews list contains the newly created review');
  assert(pubReviews.data.data[0].comment === 'Excellent plumbing service! Very professional and punctual.', 'Review comment matches');

  // Summary
  console.log('\n==================================================');
  console.log(`PHASE 3 VERIFICATION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('==================================================\n');

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
