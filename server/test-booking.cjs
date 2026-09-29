const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Booking = require('./models/Booking');
const Provider = require('./models/Provider');
const Service = require('./models/Service');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fixit_dev');

async function testBookingLogic() {
  try {
    const baseUrl = 'http://localhost:5000/api';

    // Helper for requests
    async function request(endpoint, method, body, token) {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json();
      return { status: response.status, data };
    }

    // 1. Create test users
    // Register customer
    let custRes = await request('/auth/register', 'POST', {
      name: 'Booking Customer',
      email: 'booking_cust@test.com',
      password: 'password123',
      role: 'customer'
    });
    if (custRes.status === 400 && custRes.data.message === 'Email already exists') {
      custRes = await request('/auth/login', 'POST', { email: 'booking_cust@test.com', password: 'password123' });
    }
    const custToken = custRes.data.token;

    // We will use existing seeded provider Jane
    const provRes = await request('/auth/login', 'POST', { email: 'seed_provider2@test.com', password: 'password123' });
    const provToken = provRes.data.token;

    // Get Jane's provider profile and services
    const providersRes = await request('/providers', 'GET');
    const janeProvider = providersRes.data.data.find(p => p.professionalName.includes('Jane'));
    const janeId = janeProvider._id;
    const serviceId = janeProvider.services[0]._id;

    console.log('--- BOOKING TESTS ---');

    // T1. Unauth create
    const t1 = await request('/bookings', 'POST', { providerId: janeId, serviceId, scheduledDate: '2027-01-01', scheduledTime: '10:00 AM' });
    console.log(`T1 Unauthenticated create: ${t1.status === 401 ? 'PASS' : 'FAIL'} (Expected 401, got ${t1.status})`);

    // T2. Create valid booking (Customer)
    const t2 = await request('/bookings', 'POST', { providerId: janeId, serviceId, scheduledDate: '2027-01-01', scheduledTime: '10:00 AM' }, custToken);
    console.log(`T2 Customer creates valid booking: ${t2.status === 201 ? 'PASS' : 'FAIL'} (Expected 201, got ${t2.status})`);
    const bookingId = t2.data.data._id;

    // T3. Get own booking
    const t3 = await request(`/bookings/${bookingId}`, 'GET', null, custToken);
    console.log(`T3 Customer get own booking: ${t3.status === 200 ? 'PASS' : 'FAIL'}`);

    // T4. Get assigned booking (Provider)
    const t4 = await request(`/bookings/${bookingId}`, 'GET', null, provToken);
    console.log(`T4 Provider get assigned booking: ${t4.status === 200 ? 'PASS' : 'FAIL'}`, t4.status !== 200 ? t4.data : '');

    // Create another customer to test unauthorized access
    let cust2Res = await request('/auth/register', 'POST', { name: 'C2', email: 'c2@test.com', password: 'password123', role: 'customer' });
    if (cust2Res.status === 400) cust2Res = await request('/auth/login', 'POST', { email: 'c2@test.com', password: 'password123' });
    const cust2Token = cust2Res.data.token;

    // T5. Customer cannot retrieve another customer's booking
    const t5 = await request(`/bookings/${bookingId}`, 'GET', null, cust2Token);
    console.log(`T5 Unauthorized get booking: ${t5.status === 403 ? 'PASS' : 'FAIL'}`, t5.status !== 403 ? t5.data : '');

    // T6. Unauthorized confirm (Provider cannot confirm)
    const t6 = await request(`/bookings/${bookingId}/confirm`, 'POST', null, provToken);
    console.log(`T6 Provider confirms (unauthorized): ${t6.status === 403 ? 'PASS' : 'FAIL'}`, t6.status !== 403 ? t6.data : '');

    // T7. Invalid accept (Customer cannot accept)
    const t7 = await request(`/bookings/${bookingId}/accept`, 'POST', null, custToken);
    console.log(`T7 Customer accepts (unauthorized): ${t7.status === 403 ? 'PASS' : 'FAIL'}`, t7.status !== 403 ? t7.data : '');

    // T8. Valid accept (Provider)
    const t8 = await request(`/bookings/${bookingId}/accept`, 'POST', null, provToken);
    console.log(`T8 Provider accepts: ${t8.status === 200 && t8.data.data.status === 'accepted' ? 'PASS' : 'FAIL'}`, t8.status !== 200 ? t8.data : '');

    // T9. Invalid accept (already accepted)
    const t9 = await request(`/bookings/${bookingId}/accept`, 'POST', null, provToken);
    console.log(`T9 Provider accepts again (invalid state): ${t9.status === 400 ? 'PASS' : 'FAIL'}`);

    // T10. Customer confirms
    const t10 = await request(`/bookings/${bookingId}/confirm`, 'POST', null, custToken);
    console.log(`T10 Customer confirms: ${t10.status === 200 && t10.data.data.status === 'confirmed' ? 'PASS' : 'FAIL'}`);

    // T11. Customer cancels (Valid because prompt allows confirmed -> cancelled)
    const t11 = await request(`/bookings/${bookingId}/cancel`, 'POST', null, custToken);
    console.log(`T11 Customer cancels (from confirmed): ${t11.status === 200 && t11.data.data.status === 'cancelled' ? 'PASS' : 'FAIL'}`);

    // Create a new booking to test rejection
    const tb2 = await request('/bookings', 'POST', { providerId: janeId, serviceId, scheduledDate: '2027-01-01', scheduledTime: '11:00 AM' }, custToken);
    const booking2Id = tb2.data.data._id;

    // T12. Provider rejects
    const t12 = await request(`/bookings/${booking2Id}/reject`, 'POST', null, provToken);
    console.log(`T12 Provider rejects: ${t12.status === 200 && t12.data.data.status === 'rejected' ? 'PASS' : 'FAIL'}`);

    // T13. Invalid confirmed from rejected
    const t13 = await request(`/bookings/${booking2Id}/confirm`, 'POST', null, custToken);
    console.log(`T13 Customer confirms rejected (invalid state): ${t13.status === 400 ? 'PASS' : 'FAIL'}`);

    console.log('--- PHASE 5: OTP TESTS ---');
    
    // Create a fresh booking for OTP tests
    const tb3 = await request('/bookings', 'POST', { providerId: janeId, serviceId, scheduledDate: '2027-01-01', scheduledTime: '12:00 PM' }, custToken);
    const booking3Id = tb3.data.data._id;

    // T14. Pending booking cannot verify OTP
    const t14 = await request(`/bookings/${booking3Id}/verify-otp`, 'POST', { otp: '123456' }, provToken);
    console.log(`T14 Pending cannot verify OTP: ${t14.status === 400 ? 'PASS' : 'FAIL'}`);

    // Provider accepts
    await request(`/bookings/${booking3Id}/accept`, 'POST', null, provToken);

    // T15. Accepted booking cannot verify OTP
    const t15 = await request(`/bookings/${booking3Id}/verify-otp`, 'POST', { otp: '123456' }, provToken);
    console.log(`T15 Accepted cannot verify OTP: ${t15.status === 400 ? 'PASS' : 'FAIL'}`);

    // T16. Customer confirms and generates OTP
    const t16 = await request(`/bookings/${booking3Id}/confirm`, 'POST', null, custToken);
    const otp = t16.data.otp;
    console.log(`T16 Confirm generates 6-digit OTP: ${otp && otp.length === 6 ? 'PASS' : 'FAIL'}`);

    // T17. OTP is not exposed in standard GET responses
    const t17 = await request(`/bookings/${booking3Id}`, 'GET', null, custToken);
    const getHasOtp = t17.data.data.otp && t17.data.data.otp.hash;
    console.log(`T17 GET response does not leak OTP hash/code: ${!getHasOtp ? 'PASS' : 'FAIL'}`);

    // T18. Customer cannot complete booking
    const t18 = await request(`/bookings/${booking3Id}/complete`, 'POST', null, custToken);
    console.log(`T18 Customer cannot complete: ${t18.status === 403 ? 'PASS' : 'FAIL'}`);

    // T19. Unauthenticated OTP verification
    const t19 = await request(`/bookings/${booking3Id}/verify-otp`, 'POST', { otp });
    console.log(`T19 Unauthenticated verify OTP: ${t19.status === 401 ? 'PASS' : 'FAIL'}`);

    // T20. Unauthorized user (customer) OTP verification
    const t20 = await request(`/bookings/${booking3Id}/verify-otp`, 'POST', { otp }, custToken);
    console.log(`T20 Customer verify OTP (unauthorized): ${t20.status === 403 ? 'PASS' : 'FAIL'}`);

    // T21. Invalid OTP
    const t21 = await request(`/bookings/${booking3Id}/verify-otp`, 'POST', { otp: '000000' }, provToken);
    console.log(`T21 Invalid OTP rejected: ${t21.status === 400 ? 'PASS' : 'FAIL'}`);

    // T22. Valid OTP verifies and transitions to in-progress
    const t22 = await request(`/bookings/${booking3Id}/verify-otp`, 'POST', { otp }, provToken);
    console.log(`T22 Valid OTP -> in-progress: ${t22.status === 200 && t22.data.data.status === 'in-progress' ? 'PASS' : 'FAIL'}`);

    // T23. Reused OTP rejected
    const t23 = await request(`/bookings/${booking3Id}/verify-otp`, 'POST', { otp }, provToken);
    console.log(`T23 Reused OTP rejected: ${t23.status === 400 ? 'PASS' : 'FAIL'}`);

    // T24. Provider can complete
    const t24 = await request(`/bookings/${booking3Id}/complete`, 'POST', null, provToken);
    console.log(`T24 Provider completes -> completed: ${t24.status === 200 && t24.data.data.status === 'completed' ? 'PASS' : 'FAIL'}`);

    // T25. Completed booking cannot be completed again
    const t25 = await request(`/bookings/${booking3Id}/complete`, 'POST', null, provToken);
    console.log(`T25 Complete already completed rejected: ${t25.status === 400 ? 'PASS' : 'FAIL'}`);

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    mongoose.connection.close();
  }
}

testBookingLogic();
