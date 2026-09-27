const http = require('http');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Service = require('../models/Service');
const Notification = require('../models/Notification');

const PORT = 5002;
let server;
let baseUrl = `http://localhost:${PORT}`;

// Helper: Make HTTP requests
const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

// Test Runner Utilities
let passCount = 0;
let failCount = 0;

const assert = (condition, message) => {
  if (condition) {
    passCount++;
    console.log(`  [PASS] ${message}`);
  } else {
    failCount++;
    console.error(`  [FAIL] ${message}`);
  }
};

async function runTests() {
  console.log('====================================================');
  console.log(' FIXIT PHASE 6: MAPS, GEO-LOCATION & ADMIN DASHBOARD');
  console.log('====================================================\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixit';
    await mongoose.connect(mongoUri);
    console.log('[MongoDB] Connected successfully to ' + mongoUri);

    // Sync geospatial indexes
    await Provider.syncIndexes();

    server = app.listen(PORT, () => {
      console.log(`[TestServer] Started on port ${PORT}`);
    });

    const timestamp = Date.now();

    // ----------------------------------------------------
    // SETUP: Create Admin, Provider, and Customer accounts
    // ----------------------------------------------------
    console.log('\n--- STEP 1: AUTHENTICATION & ROLES SETUP ---');

    // 1. Admin
    const adminEmail = `admin_p6_${timestamp}@fixit.test`;
    const adminRegRes = await request('POST', '/api/auth/register', {
      name: 'Super Admin',
      email: adminEmail,
      phone: '9999900001',
      password: 'password123',
      role: 'admin',
    });
    assert(adminRegRes.status === 201, 'Admin registered successfully (201 Created)');
    const adminToken = adminRegRes.data.token;
    const adminId = adminRegRes.data.user.id;
    assert(adminRegRes.data.user.role === 'admin', 'Admin user has role: admin');

    // 2. Provider 1 (Indiranagar, Bangalore: 12.9719, 77.6412)
    const prov1Email = `prov1_p6_${timestamp}@fixit.test`;
    const prov1RegRes = await request('POST', '/api/auth/register', {
      name: 'Vikram Sharma',
      email: prov1Email,
      phone: '9888800001',
      password: 'password123',
      role: 'provider',
      businessName: 'Vikram Electricals & Repairs',
    });
    assert(prov1RegRes.status === 201, 'Provider 1 registered successfully');
    const prov1Token = prov1RegRes.data.token;
    const prov1Id = prov1RegRes.data.user.id;
    let prov1Profile = prov1RegRes.data.provider;

    // 3. Provider 2 (Koramangala, Bangalore: 12.9352, 77.6245)
    const prov2Email = `prov2_p6_${timestamp}@fixit.test`;
    const prov2RegRes = await request('POST', '/api/auth/register', {
      name: 'Ananya Roy',
      email: prov2Email,
      phone: '9888800002',
      password: 'password123',
      role: 'provider',
      businessName: 'Ananya Pro Plumber',
    });
    assert(prov2RegRes.status === 201, 'Provider 2 registered successfully');
    const prov2Token = prov2RegRes.data.token;
    let prov2Profile = prov2RegRes.data.provider;

    // 4. Customer (MG Road, Bangalore: 12.9756, 77.6066)
    const custEmail = `cust_p6_${timestamp}@fixit.test`;
    const custRegRes = await request('POST', '/api/auth/register', {
      name: 'Aditya Gupta',
      email: custEmail,
      phone: '9777700001',
      password: 'password123',
      role: 'customer',
    });
    assert(custRegRes.status === 201, 'Customer registered successfully');
    const custToken = custRegRes.data.token;

    // Assign services to Provider 1 and Provider 2
    const servicesRes = await request('GET', '/api/services');
    assert(servicesRes.status === 200 && servicesRes.data.data.length > 0, 'Catalog services fetched');
    const service1 = servicesRes.data.data[0];
    const service2 = servicesRes.data.data.length > 1 ? servicesRes.data.data[1] : service1;

    await request('PUT', '/api/providers/me', { services: [service1._id] }, prov1Token);
    await request('PUT', '/api/providers/me', { services: [service2._id] }, prov2Token);

    // ----------------------------------------------------
    // STEP 2: PROVIDER LOCATION MANAGEMENT (PUT /api/providers/me/location)
    // ----------------------------------------------------
    console.log('\n--- STEP 2: PROVIDER LOCATION MANAGEMENT ---');

    // 2.1 Unauthenticated rejected
    const unauthLocRes = await request('PUT', '/api/providers/me/location', {
      latitude: 12.9719,
      longitude: 77.6412,
    });
    assert(unauthLocRes.status === 401, 'Unauthenticated location update rejected (401 Unauthorized)');

    // 2.2 Customer rejected
    const custLocRes = await request(
      'PUT',
      '/api/providers/me/location',
      { latitude: 12.9719, longitude: 77.6412 },
      custToken
    );
    assert(custLocRes.status === 403, 'Customer cannot update provider location (403 Forbidden)');

    // 2.3 Invalid coordinates
    const invLatRes = await request(
      'PUT',
      '/api/providers/me/location',
      { latitude: 195, longitude: 77.6412 },
      prov1Token
    );
    assert(invLatRes.status === 400, 'Latitude > 90 rejected (400 Bad Request)');

    const invLngRes = await request(
      'PUT',
      '/api/providers/me/location',
      { latitude: 12.9719, longitude: -200 },
      prov1Token
    );
    assert(invLngRes.status === 400, 'Longitude < -180 rejected (400 Bad Request)');

    // 2.4 Valid location update for Provider 1 (Indiranagar: 12.9719, 77.6412)
    const validLoc1Res = await request(
      'PUT',
      '/api/providers/me/location',
      {
        latitude: 12.9719,
        longitude: 77.6412,
        serviceRadius: 20,
        address: {
          street: '100 Feet Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560038',
          country: 'India',
        },
      },
      prov1Token
    );
    assert(validLoc1Res.status === 200, 'Provider 1 location updated successfully (200 OK)');
    assert(
      validLoc1Res.data.data.location.coordinates[0] === 77.6412 &&
        validLoc1Res.data.data.location.coordinates[1] === 12.9719,
      'GeoJSON coordinates stored in correct [lng, lat] order'
    );
    assert(validLoc1Res.data.data.serviceRadius === 20, 'serviceRadius updated to 20 km');
    assert(validLoc1Res.data.data.address.city === 'Bangalore', 'Provider address city updated');

    // 2.5 Valid location update for Provider 2 (Koramangala: 12.9352, 77.6245)
    const validLoc2Res = await request(
      'PUT',
      '/api/providers/me/location',
      {
        latitude: 12.9352,
        longitude: 77.6245,
        serviceRadius: 15,
        address: {
          street: '80 Feet Road, 4th Block',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560034',
        },
      },
      prov2Token
    );
    assert(validLoc2Res.status === 200, 'Provider 2 location updated successfully (200 OK)');

    // ----------------------------------------------------
    // STEP 3: LOCATION-AWARE PROVIDER DISCOVERY (GET /api/providers/nearby)
    // ----------------------------------------------------
    console.log('\n--- STEP 3: LOCATION-AWARE PROVIDER DISCOVERY ---');

    // 3.1 Missing coordinates
    const missingCoordsRes = await request('GET', '/api/providers/nearby');
    assert(missingCoordsRes.status === 400, 'Nearby search without lat/lng rejected (400 Bad Request)');

    // 3.2 Invalid coordinates
    const badCoordsRes = await request('GET', '/api/providers/nearby?lat=abc&lng=xyz');
    assert(badCoordsRes.status === 400, 'Non-numeric coordinates rejected (400 Bad Request)');

    // 3.3 Search near MG Road (12.9756, 77.6066) within 15 km
    const nearbyRes = await request(
      'GET',
      '/api/providers/nearby?lat=12.9756&lng=77.6066&radius=15'
    );
    assert(nearbyRes.status === 200, 'Nearby discovery endpoint responds (200 OK)');
    assert(Array.isArray(nearbyRes.data.data), 'Returns data array of nearby providers');
    assert(nearbyRes.data.data.length >= 2, 'Found at least both active providers in radius');

    // 3.4 Verify distance calculation
    const foundProv1 = nearbyRes.data.data.find((p) => p._id === validLoc1Res.data.data._id);
    assert(foundProv1 !== undefined, 'Provider 1 found in nearby search results');
    assert(typeof foundProv1.distance === 'number', 'Provider has numeric distance property in km');
    assert(foundProv1.distance > 0 && foundProv1.distance < 10, `Distance is realistic: ${foundProv1.distance} km`);
    assert(foundProv1.inServiceRadius === true, 'Provider inServiceRadius flag is true');

    // 3.5 Far away search (Delhi: 28.6139, 77.2090) with small radius (10km)
    const farRes = await request(
      'GET',
      '/api/providers/nearby?lat=28.6139&lng=77.2090&radius=10'
    );
    assert(farRes.status === 200, 'Far away search returns 200 OK');
    const bangaloreProv = farRes.data.data.find((p) => p._id === validLoc1Res.data.data._id);
    assert(!bangaloreProv, 'Bangalore providers correctly excluded from Delhi 10km search');

    // 3.6 Service category filter
    const serviceFilterRes = await request(
      'GET',
      `/api/providers/nearby?lat=12.9756&lng=77.6066&radius=25&service=${service1._id}`
    );
    assert(serviceFilterRes.status === 200, 'Service-filtered nearby search returns 200 OK');
    const matchedService = serviceFilterRes.data.data.every((p) =>
      p.services.some((s) => (s._id || s) === service1._id)
    );
    assert(matchedService, 'All returned nearby providers offer the requested service');

    // ----------------------------------------------------
    // STEP 4: ADMIN ACCESS CONTROL & ROLE AUTHORIZATION
    // ----------------------------------------------------
    console.log('\n--- STEP 4: ADMIN ACCESS CONTROL ---');

    // 4.1 Unauthenticated
    const unauthAdminRes = await request('GET', '/api/admin/dashboard');
    assert(unauthAdminRes.status === 401, 'Unauthenticated user rejected from admin routes (401)');

    // 4.2 Customer role
    const custAdminRes = await request('GET', '/api/admin/dashboard', null, custToken);
    assert(custAdminRes.status === 403, 'Customer forbidden from admin routes (403 Forbidden)');

    // 4.3 Provider role
    const provAdminRes = await request('GET', '/api/admin/dashboard', null, prov1Token);
    assert(provAdminRes.status === 403, 'Provider forbidden from admin routes (403 Forbidden)');

    // 4.4 Admin role
    const authAdminRes = await request('GET', '/api/admin/dashboard', null, adminToken);
    assert(authAdminRes.status === 200, 'Admin authorized to access admin dashboard (200 OK)');

    // ----------------------------------------------------
    // STEP 5: REAL ADMIN DASHBOARD STATISTICS AGGREGATION
    // ----------------------------------------------------
    console.log('\n--- STEP 5: ADMIN DASHBOARD METRICS ---');
    const stats = authAdminRes.data.data;
    assert(typeof stats.users.total === 'number' && stats.users.total >= 4, 'User total counted');
    assert(stats.users.admins >= 1, 'Admin user counted');
    assert(stats.users.providers >= 2, 'Providers counted');
    assert(stats.users.customers >= 1, 'Customers counted');
    assert(typeof stats.providers.total === 'number', 'Provider count present');
    assert(typeof stats.bookings.total === 'number', 'Booking breakdown metrics present');
    assert(typeof stats.payments.totalRevenue === 'number', 'Revenue metric present');
    assert(Array.isArray(stats.recent.bookings), 'Recent bookings array present');
    assert(Array.isArray(stats.recent.users), 'Recent users array present');

    // ----------------------------------------------------
    // STEP 6: ADMIN USER MANAGEMENT (GET /api/admin/users)
    // ----------------------------------------------------
    console.log('\n--- STEP 6: ADMIN USER MANAGEMENT ---');
    const usersRes = await request('GET', '/api/admin/users', null, adminToken);
    assert(usersRes.status === 200, 'Admin can list all users (200 OK)');
    assert(Array.isArray(usersRes.data.data), 'Returns users array');
    assert(usersRes.data.total >= 4, 'Total user count accurate');

    // Filter by role
    const customersOnlyRes = await request('GET', '/api/admin/users?role=customer', null, adminToken);
    assert(customersOnlyRes.status === 200, 'Admin can filter users by role');
    const allCustomers = customersOnlyRes.data.data.every((u) => u.role === 'customer');
    assert(allCustomers, 'Only customers returned when role=customer');

    // Single user details
    const singleUserRes = await request('GET', `/api/admin/users/${prov1Id}`, null, adminToken);
    assert(singleUserRes.status === 200, 'Admin can view single user details');
    assert(singleUserRes.data.data.user.email === prov1Email, 'User email matches');
    assert(singleUserRes.data.data.providerProfile !== null, 'Provider profile linked in user details');

    // ----------------------------------------------------
    // STEP 7: ADMIN PROVIDER MANAGEMENT & VERIFICATION TOGGLE
    // ----------------------------------------------------
    console.log('\n--- STEP 7: ADMIN PROVIDER VERIFICATION ---');
    const providersRes = await request('GET', '/api/admin/providers', null, adminToken);
    assert(providersRes.status === 200, 'Admin can list providers (200 OK)');
    const p1Doc = providersRes.data.data.find((p) => p.businessName === 'Vikram Electricals & Repairs');
    assert(p1Doc !== undefined, 'Provider 1 found in admin provider list');
    assert(p1Doc.isVerified === false, 'Provider 1 initial verification status is false');

    // Toggle verification to true
    const verifyRes = await request(
      'PUT',
      `/api/admin/providers/${p1Doc._id}/verify`,
      { isVerified: true },
      adminToken
    );
    assert(verifyRes.status === 200, 'Admin successfully verified provider (200 OK)');
    assert(verifyRes.data.data.isVerified === true, 'Provider isVerified is now true');

    // Verify provider received notification
    const prov1Notifs = await request('GET', '/api/notifications', null, prov1Token);
    const notifs = prov1Notifs.data.notifications || prov1Notifs.data.data || [];
    const verifiedNotif = notifs.find((n) => n.type === 'provider_verified');
    assert(verifiedNotif !== undefined, 'Provider received provider_verified in-app notification');

    // ----------------------------------------------------
    // STEP 8: ADMIN BOOKING INSPECTION
    // ----------------------------------------------------
    console.log('\n--- STEP 8: ADMIN BOOKINGS INSPECTION ---');
    // Create a real booking to inspect
    const bookingCreateRes = await request(
      'POST',
      '/api/bookings',
      {
        providerId: p1Doc._id,
        serviceId: service1._id,
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduledTime: '10:00 AM',
        address: { street: '123 MG Road', city: 'Bangalore' },
        price: service1.basePrice,
      },
      custToken
    );
    assert(bookingCreateRes.status === 201, 'Test booking created for inspection');
    const bookingId = bookingCreateRes.data.data._id;

    const adminBookingsRes = await request('GET', '/api/admin/bookings', null, adminToken);
    assert(adminBookingsRes.status === 200, 'Admin can list all platform bookings (200 OK)');
    assert(adminBookingsRes.data.data.some((b) => b._id === bookingId), 'New booking present in admin list');

    const adminBookingDetailRes = await request(
      'GET',
      `/api/admin/bookings/${bookingId}`,
      null,
      adminToken
    );
    assert(adminBookingDetailRes.status === 200, 'Admin can inspect detailed single booking');
    assert(adminBookingDetailRes.data.data.booking._id === bookingId, 'Booking ID matches');
    assert(adminBookingDetailRes.data.data.booking.customerId.email === custEmail, 'Customer details populated');

    // ----------------------------------------------------
    // STEP 9: ADMIN REVIEW MODERATION & RATING RECALCULATION
    // ----------------------------------------------------
    console.log('\n--- STEP 9: ADMIN REVIEW MODERATION & RATING RECALCULATION ---');
    // Advance booking through lifecycle to completed so review can be posted
    await request('PUT', `/api/bookings/${bookingId}/accept`, {}, prov1Token);
    const confirmRes = await request('PUT', `/api/bookings/${bookingId}/confirm`, {}, custToken);
    const otp = confirmRes.data.data.otp;
    await request('PUT', `/api/bookings/${bookingId}/verify-otp`, { otp }, prov1Token);
    await request('PUT', `/api/bookings/${bookingId}/complete`, {}, prov1Token);

    // Customer leaves a 5-star review
    const reviewRes = await request(
      'POST',
      '/api/reviews',
      {
        bookingId,
        rating: 5,
        comment: 'Outstanding electrical repair service! Highly recommended.',
      },
      custToken
    );
    assert(reviewRes.status === 201, 'Customer successfully posted review');
    const reviewId = reviewRes.data.data._id;

    // Check provider rating is now 5.0
    const provAfterReview = await request('GET', `/api/providers/${p1Doc._id}`);
    assert(provAfterReview.data.data.rating === 5, 'Provider rating updated to 5.0');
    assert(provAfterReview.data.data.totalReviews === 1, 'Provider totalReviews updated to 1');

    // Admin lists reviews
    const adminReviewsRes = await request('GET', '/api/admin/reviews', null, adminToken);
    assert(adminReviewsRes.status === 200, 'Admin can view all reviews (200 OK)');
    assert(adminReviewsRes.data.data.some((r) => r._id === reviewId), 'New review present in admin review list');

    // Admin moderates / deletes the review
    const deleteReviewRes = await request('DELETE', `/api/admin/reviews/${reviewId}`, null, adminToken);
    assert(deleteReviewRes.status === 200, 'Admin successfully deleted review (200 OK)');

    // Verify rating recalculation on provider
    const provAfterDelete = await request('GET', `/api/providers/${p1Doc._id}`);
    assert(provAfterDelete.data.data.rating === 0, 'Provider rating recalculated back to 0');
    assert(provAfterDelete.data.data.totalReviews === 0, 'Provider totalReviews recalculated back to 0');

    // ----------------------------------------------------
    // STEP 10: ADMIN PAYMENTS VIEW
    // ----------------------------------------------------
    console.log('\n--- STEP 10: ADMIN PAYMENTS AUDIT ---');
    const initPayRes = await request('POST', '/api/payments/create', { bookingId }, custToken);
    assert(initPayRes.status === 201, 'Demo payment initialized');
    const paymentId =
      (initPayRes.data.payment && (initPayRes.data.payment.id || initPayRes.data.payment.paymentId)) ||
      initPayRes.data.data?._id;
      (initPayRes.data.payment && (initPayRes.data.payment.id || initPayRes.data.payment.paymentId)) ||
      initPayRes.data.data?._id;

    // Process payment
    await request(
      'POST',
      `/api/payments/${paymentId}/process`,
      { method: 'upi', upiId: 'customer@okaxis' },
      custToken
    );

    // Admin views payments
    const adminPaymentsRes = await request('GET', '/api/admin/payments', null, adminToken);
    assert(adminPaymentsRes.status === 200, 'Admin can view all payments (200 OK)');
    const foundPayment = adminPaymentsRes.data.data.find((p) => p._id === paymentId);
    assert(foundPayment !== undefined, 'Processed payment listed in admin payments');
    assert(foundPayment.status === 'paid', 'Payment status is paid');

    const adminPaymentDetailRes = await request('GET', `/api/admin/payments/${paymentId}`, null, adminToken);
    assert(adminPaymentDetailRes.status === 200, 'Admin can inspect payment detail (200 OK)');

    // ----------------------------------------------------
    // STEP 11: ADMIN SERVICES CATALOG CRUD & SAFETY CHECKS
    // ----------------------------------------------------
    console.log('\n--- STEP 11: ADMIN SERVICES CATALOG CRUD ---');
    // 11.1 Create new service
    const createServiceRes = await request(
      'POST',
      '/api/admin/services',
      {
        name: `Solar Inverter Servicing ${timestamp}`,
        category: 'Electrician',
        description: 'Professional solar inverter maintenance and diagnosis',
        basePrice: 799,
        icon: 'Sun',
      },
      adminToken
    );
    assert(createServiceRes.status === 201, 'Admin can create new service in catalog (201 Created)');
    const createdServiceId = createServiceRes.data.data._id;

    // 11.2 Update service
    const updateServiceRes = await request(
      'PUT',
      `/api/admin/services/${createdServiceId}`,
      {
        basePrice: 899,
        description: 'Updated comprehensive solar inverter maintenance',
      },
      adminToken
    );
    assert(updateServiceRes.status === 200, 'Admin can update service details (200 OK)');
    assert(updateServiceRes.data.data.basePrice === 899, 'Base price updated to 899');

    // 11.3 Safe deletion of service with no active bookings
    const deleteServiceRes = await request(
      'DELETE',
      `/api/admin/services/${createdServiceId}`,
      null,
      adminToken
    );
    assert(deleteServiceRes.status === 200, 'Admin can safely delete service with no active bookings');

    // 11.4 Rejection of deletion when active bookings exist
    // Attempt to delete service1 which has active/associated records
    // Let's create an active booking with service2 and attempt to delete service2
    const activeBookingRes = await request(
      'POST',
      '/api/bookings',
      {
        providerId: prov2Profile._id,
        serviceId: service2._id,
        scheduledDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        scheduledTime: '02:00 PM',
        address: { street: '456 Koramangala', city: 'Bangalore' },
        price: service2.basePrice,
      },
      custToken
    );
    assert(activeBookingRes.status === 201, 'Active pending booking created for safety test');

    const unsafeDeleteRes = await request(
      'DELETE',
      `/api/admin/services/${service2._id}`,
      null,
      adminToken
    );
    assert(unsafeDeleteRes.status === 400, 'Deletion correctly rejected when active bookings exist (400 Bad Request)');
    assert(
      unsafeDeleteRes.data.message.includes('active booking'),
      'Informative error message mentions active bookings'
    );

    // ----------------------------------------------------
    // STEP 12: ADMIN NOTIFICATIONS AUDIT
    // ----------------------------------------------------
    console.log('\n--- STEP 12: ADMIN NOTIFICATIONS SYSTEM AUDIT ---');
    const adminNotifsRes = await request('GET', '/api/admin/notifications', null, adminToken);
    assert(adminNotifsRes.status === 200, 'Admin can audit system-wide notifications (200 OK)');
    assert(Array.isArray(adminNotifsRes.data.data), 'Returns notification log list');
    assert(adminNotifsRes.data.data.length > 0, 'Recent system notifications populated');

    console.log('\n====================================================');
    console.log(` PHASE 6 TEST RUN SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('====================================================');

    if (failCount > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
  }
}

runTests();
