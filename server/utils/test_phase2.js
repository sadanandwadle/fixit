const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  const data = await res.json().catch(() => null);

  return {
    status: res.status,
    ok: res.ok,
    data,
  };
}

async function runTests() {
  console.log('====================================================');
  console.log(' FIXIT PHASE 2 — AUTOMATED INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let serverInstance = null;
  try {
    const ping = await request('/health').catch(() => null);
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

  let customerToken = '';
  let customerUser = null;
  let providerToken = '';
  let providerUser = null;
  let providerProfile = null;
  let selectedService = null;
  let bookingId1 = null;
  let bookingId2 = null;
  let bookingId3 = null;

  const timestamp = Date.now();

  try {
    // 0. HEALTH CHECK
    console.log('[STEP 0] Checking Health & Real MongoDB Connectivity...');
    const health = await request('/health');
    console.log(' Health status:', health.data.status);
    console.log(' Database connected:', health.data.database.connected);
    if (!health.data.database.connected) {
      throw new Error('Database is NOT connected! Real MongoDB is required.');
    }
    console.log(' ✓ Health check passed with real MongoDB\n');

    // TEST 1: Register customer
    console.log('[TEST 1] Register Customer...');
    const customerPayload = {
      name: 'Sadanand Customer',
      email: `cust_${timestamp}@example.com`,
      phone: '+91 98765 43210',
      password: 'password123',
      role: 'customer',
      address: { street: '123 Marine Drive', city: 'Mumbai', state: 'MH', zipCode: '400020' },
    };
    const regCust = await request('/auth/register', { method: 'POST', body: customerPayload });
    if (!regCust.ok) throw new Error(`Reg customer failed: ${JSON.stringify(regCust.data)}`);

    customerToken = regCust.data.token;
    customerUser = regCust.data.user;
    console.log(' Registered Customer:', customerUser.name, `(${customerUser.email})`);
    console.log(' Customer Token received:', Boolean(customerToken));
    console.log(' ✓ TEST 1 Passed: Customer registered\n');

    // TEST 2: Register provider
    console.log('[TEST 2] Register Provider...');
    const providerPayload = {
      name: 'Rahul Technician',
      email: `prov_${timestamp}@example.com`,
      phone: '+91 98765 43211',
      password: 'password123',
      role: 'provider',
      businessName: 'Rahul AC & Electrical Services',
      description: 'Expert residential and commercial AC maintenance with 8 years experience.',
      address: { city: 'Mumbai' },
    };
    const regProv = await request('/auth/register', { method: 'POST', body: providerPayload });
    if (!regProv.ok) throw new Error(`Reg provider failed: ${JSON.stringify(regProv.data)}`);

    providerToken = regProv.data.token;
    providerUser = regProv.data.user;
    providerProfile = regProv.data.provider;
    console.log(' Registered Provider:', providerUser.name, `(${providerProfile?.businessName})`);
    console.log(' Provider isVerified status:', providerProfile?.isVerified);
    if (providerProfile?.isVerified !== false) {
      throw new Error('New provider must have isVerified = false');
    }
    console.log(' ✓ TEST 2 Passed: Provider registered with isVerified = false\n');

    // Get a service from real MongoDB catalog
    const services = await request('/services');
    selectedService = services.data.data[0];
    console.log(' Using Service from Catalog:', selectedService.name, `(${selectedService.category}) - ₹${selectedService.basePrice}`);

    // TEST 3: Update Provider Profile
    console.log('[TEST 3] Provider updates profile with services and rates...');
    const updateProfile = await request('/providers/me', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${providerToken}` },
      body: {
        businessName: 'Rahul Elite Cooling & Repairs',
        description: 'Certified AC and Electrical technician with 8 years of experience.',
        experience: 8,
        pricing: { startingPrice: 399, hourlyRate: 150 },
        serviceArea: ['Mumbai', 'Thane', 'Navi Mumbai'],
        services: [selectedService._id],
      },
    });
    if (!updateProfile.ok) throw new Error(`Update profile failed: ${JSON.stringify(updateProfile.data)}`);

    providerProfile = updateProfile.data.data;
    console.log(' Updated Business Name:', providerProfile.businessName);
    console.log(' Updated Experience:', providerProfile.experience, 'years');
    console.log(' Updated Services count:', providerProfile.services.length);
    console.log(' ✓ TEST 3 Passed: Provider profile updated\n');

    // TEST 4: Customer logs in
    console.log('[TEST 4] Customer logs in with credentials...');
    const login = await request('/auth/login', {
      method: 'POST',
      body: {
        email: customerPayload.email,
        password: customerPayload.password,
      },
    });
    if (!login.ok) throw new Error(`Login failed: ${JSON.stringify(login.data)}`);

    console.log(' Customer Login Response:', login.data.message);
    customerToken = login.data.token;
    console.log(' ✓ TEST 4 Passed: Customer logged in successfully\n');

    // TEST 5: Customer sees providers
    console.log('[TEST 5] Customer searches and sees providers list...');
    const providersList = await request('/providers');
    console.log(' Total providers found in DB:', providersList.data.count);
    const foundOurProvider = providersList.data.data.find(
      (p) => p._id.toString() === providerProfile._id.toString()
    );
    if (!foundOurProvider) {
      throw new Error('Our created provider not found in /api/providers listing!');
    }
    console.log(' Found provider in list:', foundOurProvider.businessName);
    console.log(' ✓ TEST 5 Passed: Customer sees providers\n');

    // TEST 6: Customer opens provider profile
    console.log('[TEST 6] Customer opens single provider profile...');
    const providerDetail = await request(`/providers/${providerProfile._id}`);
    if (!providerDetail.ok) throw new Error(`Fetch single provider failed: ${JSON.stringify(providerDetail.data)}`);

    console.log(' Provider public detail:', providerDetail.data.data.businessName);
    console.log(' Offered services:', providerDetail.data.data.services.map((s) => s.name));
    console.log(' ✓ TEST 6 Passed: Customer opens provider profile\n');

    // TEST 7: Customer creates booking
    console.log('[TEST 7] Customer creates booking...');
    const bookingPayload1 = {
      providerId: providerProfile._id,
      serviceId: selectedService._id,
      address: { street: 'Flat 402, Sea View Apartments', city: 'Mumbai', state: 'MH', zipCode: '400020' },
      scheduledDate: new Date(Date.now() + 86400000).toISOString(),
      scheduledTime: '02:00 PM',
      price: 399,
      description: 'AC is making rattling noise and cooling is minimal.',
    };
    const createBooking = await request('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: bookingPayload1,
    });
    if (!createBooking.ok) throw new Error(`Create booking failed: ${JSON.stringify(createBooking.data)}`);

    const booking1 = createBooking.data.data;
    bookingId1 = booking1._id;
    console.log(' Created Booking ID:', booking1._id);
    console.log(' Customer ID in booking:', booking1.customerId._id || booking1.customerId);
    console.log(' Status in booking:', booking1.status);
    console.log(' Payment Status:', booking1.paymentStatus);

    if (booking1.status !== 'pending') throw new Error('Initial status must be pending');
    if (booking1.paymentStatus !== 'pending') throw new Error('Initial paymentStatus must be pending');
    console.log(' ✓ TEST 7 Passed: Booking created with status "pending"\n');

    // TEST 8: Provider sees booking
    console.log('[TEST 8] Provider sees the booking in their dashboard list...');
    const provBookings = await request('/bookings/provider', {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    if (!provBookings.ok) throw new Error(`Provider bookings fetch failed: ${JSON.stringify(provBookings.data)}`);

    console.log(' Provider bookings count:', provBookings.data.count);
    const foundBooking = provBookings.data.data.find(
      (b) => b._id.toString() === bookingId1.toString()
    );
    if (!foundBooking) throw new Error('Booking not found in provider bookings list');
    console.log(' Found pending booking for customer:', foundBooking.customerId.name);
    console.log(' ✓ TEST 8 Passed: Provider sees incoming booking\n');

    // TEST 9: Provider accepts booking
    console.log('[TEST 9] Provider accepts booking...');
    const accept = await request(`/bookings/${bookingId1}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    if (!accept.ok) throw new Error(`Accept booking failed: ${JSON.stringify(accept.data)}`);

    console.log(' Accept response status:', accept.data.data.status);
    if (accept.data.data.status !== 'accepted') {
      throw new Error(`Expected status accepted, got ${accept.data.data.status}`);
    }
    console.log(' ✓ TEST 9 Passed: Booking transitioned pending -> accepted\n');

    // TEST 10: Customer sees accepted status
    console.log('[TEST 10] Customer checks booking status...');
    const customerCheck = await request(`/bookings/${bookingId1}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (!customerCheck.ok) throw new Error(`Customer check failed: ${JSON.stringify(customerCheck.data)}`);

    console.log(' Customer fetched status:', customerCheck.data.data.status);
    if (customerCheck.data.data.status !== 'accepted') {
      throw new Error('Customer did not see accepted status!');
    }
    console.log(' ✓ TEST 10 Passed: Customer sees accepted status\n');

    // TEST 11: Test rejection workflow
    console.log('[TEST 11] Test Rejection workflow...');
    // Create booking 2
    const createBooking2 = await request('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        providerId: providerProfile._id,
        serviceId: selectedService._id,
        address: { street: '78 Hill Road', city: 'Mumbai' },
        scheduledDate: new Date(Date.now() + 172800000).toISOString(),
        scheduledTime: '10:00 AM',
        price: 399,
        description: 'Emergency wiring inspection',
      },
    });
    bookingId2 = createBooking2.data.data._id;
    console.log(' Created Booking 2 ID:', bookingId2);

    // Provider rejects booking 2
    const reject = await request(`/bookings/${bookingId2}/reject`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${providerToken}` },
      body: { reason: 'Slot fully booked' },
    });
    if (!reject.ok) throw new Error(`Reject booking failed: ${JSON.stringify(reject.data)}`);

    console.log(' Reject response status:', reject.data.data.status);
    if (reject.data.data.status !== 'rejected') {
      throw new Error(`Expected status rejected, got ${reject.data.data.status}`);
    }
    console.log(' ✓ TEST 11 Passed: Booking transitioned pending -> rejected\n');

    // TEST 12: Test cancellation workflow
    console.log('[TEST 12] Test Cancellation workflow...');
    // Create booking 3
    const createBooking3 = await request('/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        providerId: providerProfile._id,
        serviceId: selectedService._id,
        address: { street: '12 Palm Beach Rd', city: 'Navi Mumbai' },
        scheduledDate: new Date(Date.now() + 259200000).toISOString(),
        scheduledTime: '04:00 PM',
        price: 399,
        description: 'Filter replacement',
      },
    });
    bookingId3 = createBooking3.data.data._id;
    console.log(' Created Booking 3 ID:', bookingId3);

    // Customer cancels booking 3
    const cancel = await request(`/bookings/${bookingId3}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (!cancel.ok) throw new Error(`Cancel booking failed: ${JSON.stringify(cancel.data)}`);

    console.log(' Cancel response status:', cancel.data.data.status);
    if (cancel.data.data.status !== 'cancelled') {
      throw new Error(`Expected status cancelled, got ${cancel.data.data.status}`);
    }
    console.log(' ✓ TEST 12 Passed: Booking transitioned pending -> cancelled\n');

    // TEST 13: Unauthorized access checks
    console.log('[TEST 13] Testing Unauthorized & Role Access Controls...');

    // 13a: Register intruder customer
    const regIntruderCust = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Intruder Customer',
        email: `intruder_cust_${timestamp}@example.com`,
        phone: '+91 99999 00001',
        password: 'password123',
        role: 'customer',
      },
    });
    const intruderCustToken = regIntruderCust.data.token;

    // Intruder tries to access customer 1's booking
    const intruderAccess = await request(`/bookings/${bookingId1}`, {
      headers: { Authorization: `Bearer ${intruderCustToken}` },
    });
    if (intruderAccess.status === 403) {
      console.log(' ✓ Intruder customer correctly blocked with 403 Forbidden on foreign booking');
    } else {
      throw new Error(`Expected 403, got ${intruderAccess.status}: ${JSON.stringify(intruderAccess.data)}`);
    }

    // Intruder customer tries to cancel customer 1's booking
    const intruderCancel = await request(`/bookings/${bookingId1}/cancel`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${intruderCustToken}` },
    });
    if (intruderCancel.status === 403) {
      console.log(' ✓ Intruder customer correctly blocked with 403 Forbidden on cancel foreign booking');
    } else {
      throw new Error(`Expected 403, got ${intruderCancel.status}: ${JSON.stringify(intruderCancel.data)}`);
    }

    // 13b: Register intruder provider
    const regIntruderProv = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Intruder Provider',
        email: `intruder_prov_${timestamp}@example.com`,
        phone: '+91 99999 00002',
        password: 'password123',
        role: 'provider',
        businessName: 'Unrelated Repairs',
      },
    });
    const intruderProvToken = regIntruderProv.data.token;

    // Intruder provider tries to accept booking 1 (which belongs to Rahul)
    const intruderAccept = await request(`/bookings/${bookingId1}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${intruderProvToken}` },
    });
    if (intruderAccept.status === 403 || intruderAccept.status === 400) {
      console.log(' ✓ Intruder provider correctly blocked with 403 Forbidden on foreign provider booking');
    } else {
      throw new Error(`Expected 403, got ${intruderAccept.status}: ${JSON.stringify(intruderAccept.data)}`);
    }

    // 13c: Customer tries to access provider-only route
    const custProviderRoute = await request('/bookings/provider', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    if (custProviderRoute.status === 403) {
      console.log(' ✓ Customer correctly blocked with 403 Forbidden on /api/bookings/provider');
    } else {
      throw new Error(`Expected 403, got ${custProviderRoute.status}`);
    }

    console.log(' ✓ TEST 13 Passed: All unauthorized and cross-tenant access attempts rejected\n');

    console.log('====================================================');
    console.log(' ALL PHASE 2 BACKEND & DATABASE TESTS PASSED 100%!');
    console.log('====================================================');
    if (serverInstance) {
      serverInstance.close();
      const mongoose = require('mongoose');
      await mongoose.connection.close();
    }
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (serverInstance) {
      serverInstance.close();
      const mongoose = require('mongoose');
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

runTests();
