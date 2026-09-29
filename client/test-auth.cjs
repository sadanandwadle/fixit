const axios = require('axios');

const baseUrl = 'http://localhost:5000/api/auth';

async function testEndpoint(name, method, endpoint, data = null, token = null, expectedStatus) {
    console.log(`Testing: ${name}`);
    const config = {
        method,
        url: `${baseUrl}${endpoint}`,
        data,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        validateStatus: () => true, // Don't throw on HTTP errors
    };
    
    try {
        const response = await axios(config);
        if (response.status === expectedStatus) {
            console.log(`  [PASS] Status ${response.status}`);
            return response.data;
        } else {
            console.log(`  [FAIL] Expected ${expectedStatus} but got ${response.status}`);
            console.log(response.data);
            return response.data;
        }
    } catch (error) {
        console.log(`  [ERROR] ${error.message}`);
    }
}

async function runTests() {
    // 1. Valid Registration
    const reg1 = await testEndpoint('Valid Customer Registration', 'POST', '/register', {
        name: 'Alice', email: 'alice@test.com', password: 'password123', role: 'customer'
    }, null, 201);
    const token = reg1?.token;

    // 2. Duplicate Registration
    await testEndpoint('Duplicate Registration', 'POST', '/register', {
        name: 'Alice2', email: 'alice@test.com', password: 'password123'
    }, null, 400);

    // 3. Invalid Registration
    await testEndpoint('Invalid Registration (Missing Pwd)', 'POST', '/register', {
        name: 'Alice2', email: 'alice2@test.com'
    }, null, 400);

    // 4. Valid Provider Registration
    await testEndpoint('Valid Provider Registration', 'POST', '/register', {
        name: 'Bob', email: 'bob@test.com', password: 'password123', role: 'provider'
    }, null, 201);

    // 5. Public Admin Registration Prevention
    const adminReg = await testEndpoint('Public Admin Registration Prevention', 'POST', '/register', {
        name: 'Eve', email: 'eve@test.com', password: 'password123', role: 'admin'
    }, null, 201);
    if (adminReg?.user?.role !== 'admin') {
        console.log('  [PASS] Admin registration was properly downgraded to customer/provider');
    } else {
        console.log('  [FAIL] User was successfully created as admin');
    }

    // 6. Valid Login
    await testEndpoint('Valid Login', 'POST', '/login', {
        email: 'alice@test.com', password: 'password123'
    }, null, 200);

    // 7. Invalid Login
    await testEndpoint('Invalid Login', 'POST', '/login', {
        email: 'alice@test.com', password: 'wrongpassword'
    }, null, 401);

    // 8. JWT Valid Token (/me)
    await testEndpoint('Protected Route (Valid Token)', 'GET', '/me', null, token, 200);

    // 9. JWT Missing Token (/me)
    await testEndpoint('Protected Route (Missing Token)', 'GET', '/me', null, null, 401);

    // 10. JWT Invalid Token (/me)
    await testEndpoint('Protected Route (Invalid Token)', 'GET', '/me', null, 'invalid_token_123', 401);
}

runTests();
