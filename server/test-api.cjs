const baseUrl = 'http://localhost:5000/api';

async function testEndpoint(name, method, endpoint, expectedStatus) {
    console.log(`Testing: ${name}`);
    try {
        const response = await fetch(`${baseUrl}${endpoint}`, { method });
        const data = await response.json();
        
        if (response.status === expectedStatus) {
            console.log(`  [PASS] Status ${response.status}`);
            return data;
        } else {
            console.log(`  [FAIL] Expected ${expectedStatus} but got ${response.status}`);
            console.log(data);
            return null;
        }
    } catch (error) {
        console.log(`  [ERROR] ${error.message}`);
    }
}

async function runTests() {
    await testEndpoint('Health Check', 'GET', '/health', 200);
    
    const servicesRes = await testEndpoint('Get All Services', 'GET', '/services', 200);
    let serviceId = 'invalid_id';
    if (servicesRes && servicesRes.data && servicesRes.data.length > 0) {
        serviceId = servicesRes.data[0]._id;
    }
    
    await testEndpoint('Get Single Service', 'GET', `/services/${serviceId}`, 200);
    await testEndpoint('Get Invalid Service ID', 'GET', '/services/invalid123', 404);
    
    const providersRes = await testEndpoint('Get All Providers', 'GET', '/providers', 200);
    let providerId = 'invalid_id';
    if (providersRes && providersRes.data && providersRes.data.length > 0) {
        providerId = providersRes.data[0]._id;
        if (providersRes.data[0].user && providersRes.data[0].user.password) {
            console.log('  [FAIL] Password exposed in provider user object!');
        }
    }
    
    await testEndpoint('Get Single Provider', 'GET', `/providers/${providerId}`, 200);
    await testEndpoint('Get Invalid Provider ID', 'GET', '/providers/invalid123', 404);
    
    const filterRes = await testEndpoint('Get Providers filtered by Search', 'GET', '/providers?search=John', 200);
    if (filterRes && filterRes.data) {
        if (filterRes.data.length > 0) console.log('  [PASS] Filter returned results');
    }
    
    const emptyRes = await testEndpoint('Get Empty Providers (No Match)', 'GET', '/providers?search=nonexistentterm123', 200);
    if (emptyRes && emptyRes.data && emptyRes.data.length === 0) {
        console.log('  [PASS] Correctly returned empty array');
    }
}

runTests();
