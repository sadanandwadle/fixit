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

    console.log('--- PHASE 6: PAYMENT & REVIEWS TESTS ---');
    
    // Create a new booking for payment and review negative testing
    const tb4 = await request('/bookings', 'POST', { providerId: janeId, serviceId, scheduledDate: '2027-01-01', scheduledTime: '01:00 PM' }, custToken);
    const booking4Id = tb4.data.data._id;

    // T26. Payment before completion rejected
    const t26 = await request(`/bookings/${booking4Id}/pay`, 'POST', { amount: 10 }, custToken);
    console.log(`T26 Payment before completion rejected: ${t26.status === 400 ? 'PASS' : 'FAIL'}`);

    // T27. Review before completion rejected
    const t27 = await request('/reviews', 'POST', { bookingId: booking4Id, rating: 5, comment: 'Great' }, custToken);
    console.log(`T27 Review before completion rejected: ${t27.status === 400 ? 'PASS' : 'FAIL'}`);

    // Progress booking3Id which is completed
    // T28. Unauthenticated payment rejected
    const t28 = await request(`/bookings/${booking3Id}/pay`, 'POST', { amount: 50 });
    console.log(`T28 Unauthenticated payment rejected: ${t28.status === 401 ? 'PASS' : 'FAIL'}`);

    // T29. Provider payment rejected
    const t29 = await request(`/bookings/${booking3Id}/pay`, 'POST', null, provToken);
    console.log(`T29 Provider payment rejected: ${t29.status === 403 ? 'PASS' : 'FAIL'}`);

    // T30. Customer paying for another customer's booking rejected
    const t30 = await request(`/bookings/${booking3Id}/pay`, 'POST', null, cust2Token);
    console.log(`T30 Customer paying for another customer's booking rejected: ${t30.status === 403 ? 'PASS' : 'FAIL'}`);

    // T31. Payment for completed booking succeeds
    const t31 = await request(`/bookings/${booking3Id}/pay`, 'POST', { amount: 1 }, custToken);
    console.log(`T31 Payment for completed booking succeeds: ${t31.status === 201 ? 'PASS' : 'FAIL'}`, t31.status !== 201 ? t31.data : '');

    // T32. Duplicate payment rejected
    const t32 = await request(`/bookings/${booking3Id}/pay`, 'POST', null, custToken);
    console.log(`T32 Duplicate payment rejected: ${t32.status === 400 ? 'PASS' : 'FAIL'}`);

    // T33. Payment amount cannot be arbitrarily controlled by client
    // Since we ignore the body in backend, we verify the stored amount is $50
    const amtCheck = t31.data.data.amount === 50;
    console.log(`T33 Payment amount cannot be arbitrarily controlled: ${amtCheck ? 'PASS' : 'FAIL'}`);

    // REVIEWS
    // T34. Unauthenticated review rejected
    const t34 = await request('/reviews', 'POST', { bookingId: booking3Id, rating: 5 });
    console.log(`T34 Unauthenticated review rejected: ${t34.status === 401 ? 'PASS' : 'FAIL'}`);

    // T35. Provider review creation rejected
    const t35 = await request('/reviews', 'POST', { bookingId: booking3Id, rating: 5 }, provToken);
    console.log(`T35 Provider review creation rejected: ${t35.status === 403 ? 'PASS' : 'FAIL'}`);

    // T36. Customer reviewing another customer's booking rejected
    const t36 = await request('/reviews', 'POST', { bookingId: booking3Id, rating: 5 }, cust2Token);
    console.log(`T36 Customer reviewing another's booking rejected: ${t36.status === 403 ? 'PASS' : 'FAIL'}`);

    // T37. Invalid rating rejected (non-numeric, <1, >5)
    const t37a = await request('/reviews', 'POST', { bookingId: booking3Id, rating: 'abc' }, custToken);
    const t37b = await request('/reviews', 'POST', { bookingId: booking3Id, rating: 0 }, custToken);
    const t37c = await request('/reviews', 'POST', { bookingId: booking3Id, rating: 6 }, custToken);
    console.log(`T37 Invalid rating rejected: ${t37a.status === 400 && t37b.status === 400 && t37c.status === 400 ? 'PASS' : 'FAIL'}`);

    // T38. Valid review succeeds
    const t38 = await request('/reviews', 'POST', { bookingId: booking3Id, rating: 5, comment: 'Excellent' }, custToken);
    console.log(`T38 Valid review succeeds: ${t38.status === 201 ? 'PASS' : 'FAIL'}`, t38.status !== 201 ? t38.data : '');

    // T39. Duplicate review rejected
    const t39 = await request('/reviews', 'POST', { bookingId: booking3Id, rating: 4 }, custToken);
    console.log(`T39 Duplicate review rejected: ${t39.status === 400 ? 'PASS' : 'FAIL'}`);

    // Check if Provider rating updated
    const pInfo = await request('/providers', 'GET');
    const updatedJane = pInfo.data.data.find(p => p._id === janeId);
    console.log(`T40 Provider rating updated correctly: ${updatedJane.rating === 5 && updatedJane.reviewCount >= 1 ? 'PASS' : 'FAIL'}`, `Actual rating: ${updatedJane.rating}, count: ${updatedJane.reviewCount}`);

    // PHASE 7: NOTIFICATIONS
    // Check if the expected notifications exist for provider and customer.
    const custNotifsReq = await request('/notifications?limit=100', 'GET', null, custToken);
    const provNotifsReq = await request('/notifications?limit=100', 'GET', null, provToken);
    
    const custNotifs = custNotifsReq.data.data;
    const provNotifs = provNotifsReq.data.data;

    // customer should have: BOOKING_ACCEPTED, SERVICE_STARTED, SERVICE_COMPLETED
    const custTypes = custNotifs.map(n => n.type);
    const t41 = custTypes.includes('BOOKING_ACCEPTED') && custTypes.includes('SERVICE_STARTED') && custTypes.includes('SERVICE_COMPLETED');
    console.log(`T41 Customer received expected booking notifications: ${t41 ? 'PASS' : 'FAIL'}`);

    // provider should have: BOOKING_CREATED, BOOKING_CONFIRMED, PAYMENT_COMPLETED, REVIEW_RECEIVED
    const provTypes = provNotifs.map(n => n.type);
    const t42 = provTypes.includes('BOOKING_CREATED') && provTypes.includes('BOOKING_CONFIRMED') && provTypes.includes('PAYMENT_COMPLETED') && provTypes.includes('REVIEW_RECEIVED');
    console.log(`T42 Provider received expected booking notifications: ${t42 ? 'PASS' : 'FAIL'}`);

    // T43 Unauthenticated GET notifications rejected
    const t43 = await request('/notifications', 'GET', null, null);
    console.log(`T43 Unauthenticated GET notifications rejected: ${t43.status === 401 ? 'PASS' : 'FAIL'}`);

    // T44 Get unread count
    const t44 = await request('/notifications/unread-count', 'GET', null, custToken);
    console.log(`T44 Get unread count works: ${t44.data.count > 0 ? 'PASS' : 'FAIL'}`);

    // T45 Mark one notification as read
    const notifToRead = custNotifs[0];
    const t45 = await request(`/notifications/${notifToRead._id}/read`, 'POST', null, custToken);
    console.log(`T45 Mark one notification as read works: ${t45.status === 200 && t45.data.data.isRead === true ? 'PASS' : 'FAIL'}`);

    // T46 User cannot mark another user's notification as read
    const t46 = await request(`/notifications/${notifToRead._id}/read`, 'POST', null, provToken);
    console.log(`T46 User cannot mark another user's notification as read: ${t46.status === 403 ? 'PASS' : 'FAIL'}`);

    // T47 Mark all as read works
    const t47 = await request('/notifications/read-all', 'POST', null, custToken);
    const t47Check = await request('/notifications/unread-count', 'GET', null, custToken);
    console.log(`T47 Mark all as read works: ${t47.status === 200 && t47Check.data.count === 0 ? 'PASS' : 'FAIL'}`);

    console.log('--- PHASE 8: MAPS & LOCATION TESTS ---');
    
    // Create a second provider for location tests (Provider B)
    let provBRes = await request('/auth/register', 'POST', {
      name: 'Provider B', email: 'prov_b@test.com', password: 'password123', role: 'provider'
    });
    if (provBRes.status === 400) provBRes = await request('/auth/login', 'POST', { email: 'prov_b@test.com', password: 'password123' });
    const provBToken = provBRes.data.token;
    
    // Seed provider B profile
    const pBProfile = await Provider.findOne({ user: (await User.findOne({ email: 'prov_b@test.com' }))._id });
    if (!pBProfile) {
      await Provider.create({
        user: (await User.findOne({ email: 'prov_b@test.com' }))._id,
        professionalName: 'Provider B Services',
        description: 'Testing location features',
        services: [serviceId]
      });
    }

    // LOCATION TESTS
    // T48 Unauthenticated location update rejected
    const t48 = await request('/providers/location', 'PUT', { latitude: 18.5204, longitude: 73.8567 });
    console.log(`T48 Unauthenticated location update rejected: ${t48.status === 401 ? 'PASS' : 'FAIL'}`);

    // T49 Customer location update rejected
    const t49 = await request('/providers/location', 'PUT', { latitude: 18.5204, longitude: 73.8567 }, custToken);
    console.log(`T49 Customer location update rejected: ${t49.status === 403 ? 'PASS' : 'FAIL'}`);

    // T50 Provider can update own location
    const t50 = await request('/providers/location', 'PUT', { latitude: 18.5204, longitude: 73.8567, serviceRadius: 10 }, provToken);
    console.log(`T50 Provider can update own location: ${t50.status === 200 ? 'PASS' : 'FAIL'}`);

    // T51 Provider cannot update another provider's location
    // Since the endpoint uses JWT identity, you can't even supply another provider's ID. 
    // We just ensure we can't hijack by injecting an ID.
    const t51 = await request('/providers/location', 'PUT', { _id: pBProfile ? pBProfile._id : 'hijack', latitude: 10, longitude: 10 }, provToken);
    const hijackedCheck = await request('/providers', 'GET');
    const pB = hijackedCheck.data.data.find(p => p.professionalName === 'Provider B Services');
    console.log(`T51 Provider cannot update another provider's location (JWT isolated): ${pB.location.coordinates[0] !== 10 ? 'PASS' : 'FAIL'}`);

    // Restore Jane's proper location after T51 side-effect
    await request('/providers/location', 'PUT', { latitude: 18.5204, longitude: 73.8567, serviceRadius: 10 }, provToken);

    // T52 Invalid latitude rejected
    const t52 = await request('/providers/location', 'PUT', { latitude: 100, longitude: 73.8567 }, provToken);
    console.log(`T52 Invalid latitude rejected: ${t52.status === 400 ? 'PASS' : 'FAIL'}`);

    // T53 Invalid longitude rejected
    const t53 = await request('/providers/location', 'PUT', { latitude: 18.5204, longitude: 200 }, provToken);
    console.log(`T53 Invalid longitude rejected: ${t53.status === 400 ? 'PASS' : 'FAIL'}`);

    // T54 Invalid radius rejected
    const t54 = await request('/providers/location', 'PUT', { latitude: 18.5204, longitude: 73.8567, serviceRadius: -5 }, provToken);
    console.log(`T54 Invalid radius rejected: ${t54.status === 400 ? 'PASS' : 'FAIL'}`);

    // T55 Valid GeoJSON location stored correctly & Longitude/latitude order verified
    const locCheck = t50.data.data.location;
    console.log(`T55 GeoJSON Point [lng, lat] verified: ${locCheck.type === 'Point' && locCheck.coordinates[0] === 73.8567 && locCheck.coordinates[1] === 18.5204 ? 'PASS' : 'FAIL'}`);

    // T56 Provider location retrieval works (Populated in getProvider)
    const t56 = await request(`/providers/${janeId}`, 'GET');
    console.log(`T56 Provider location retrieval works: ${t56.data.data.location.coordinates[0] === 73.8567 ? 'PASS' : 'FAIL'}`);

    // NEARBY SEARCH TESTS
    // Set Provider B to a different far away location (e.g. Mumbai ~120km away)
    await request('/providers/location', 'PUT', { latitude: 19.0760, longitude: 72.8777, serviceRadius: 10 }, provBToken);

    // T57 Nearby provider returned & T58 Provider outside radius excluded
    // Search from Pune (18.5204, 73.8567) with radius 50km
    const t57 = await request('/providers?lat=18.5204&lng=73.8567&radius=50', 'GET');
    const nearbyNames = t57.data.data.map(p => p.professionalName);
    console.log(`T57 Nearby provider returned (Jane found): ${nearbyNames.includes(janeProvider.professionalName) ? 'PASS' : 'FAIL'}`);
    console.log(`T58 Provider outside radius excluded (Provider B excluded): ${!nearbyNames.includes('Provider B Services') ? 'PASS' : 'FAIL'}`);

    // T59 Service filter works
    const t59 = await request(`/providers?lat=18.5204&lng=73.8567&radius=50&service=${serviceId}`, 'GET');
    console.log(`T59 Service filter works: ${t59.data.data.length > 0 && t59.data.data[0].services.some(s => s._id === serviceId) ? 'PASS' : 'FAIL'}`);

    // T60 Provider without location handled correctly (handled by $ne [0,0] filter)
    const t60 = await request('/providers?lat=18.5204&lng=73.8567&radius=50', 'GET');
    const hasZeroZero = t60.data.data.some(p => p.location.coordinates[0] === 0 && p.location.coordinates[1] === 0);
    console.log(`T60 Provider without location handled: ${!hasZeroZero ? 'PASS' : 'FAIL'}`);

    // T61 Empty nearby result handled correctly
    const t61 = await request('/providers?lat=80.0&lng=80.0&radius=10', 'GET');
    console.log(`T61 Empty nearby result handled correctly: ${t61.data.data.length === 0 ? 'PASS' : 'FAIL'}`);

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    mongoose.connection.close();
  }
}

testBookingLogic();
