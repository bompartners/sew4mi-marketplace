#!/usr/bin/env node

/**
 * Order Creation Test Script
 * Tests the /api/orders/create endpoint with the new fabric_choice column
 */

const https = require('https');

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:3000',
  CUSTOMER_ID: process.env.CUSTOMER_ID || 'REPLACE_WITH_CUSTOMER_UUID',
  TAILOR_ID: process.env.TAILOR_ID || 'REPLACE_WITH_TAILOR_UUID',
  AUTH_TOKEN: process.env.AUTH_TOKEN || 'REPLACE_WITH_AUTH_TOKEN'
};

// Test scenarios
const SCENARIOS = {
  validOrder: {
    name: '✅ Valid Order Creation',
    data: {
      customerId: CONFIG.CUSTOMER_ID,
      tailorId: CONFIG.TAILOR_ID,
      measurementProfileId: '00000000-0000-0000-0000-000000000001',
      garmentType: 'Traditional Suit',
      fabricChoice: 'TAILOR_SOURCED',
      specialInstructions: 'Navy blue fabric preferred',
      totalAmount: 450.00,
      estimatedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      urgencyLevel: 'STANDARD'
    },
    expectedStatus: 201
  },
  
  missingFabricChoice: {
    name: '❌ Missing fabricChoice (should fail)',
    data: {
      customerId: CONFIG.CUSTOMER_ID,
      tailorId: CONFIG.TAILOR_ID,
      measurementProfileId: '00000000-0000-0000-0000-000000000001',
      garmentType: 'Traditional Suit',
      // Missing fabricChoice
      totalAmount: 450.00,
      estimatedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      urgencyLevel: 'STANDARD'
    },
    expectedStatus: 400
  },

  invalidUrgencyLevel: {
    name: '❌ Invalid urgencyLevel (should fail)',
    data: {
      customerId: CONFIG.CUSTOMER_ID,
      tailorId: CONFIG.TAILOR_ID,
      measurementProfileId: '00000000-0000-0000-0000-000000000001',
      garmentType: 'Traditional Suit',
      fabricChoice: 'TAILOR_SOURCED',
      totalAmount: 450.00,
      estimatedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      urgencyLevel: 'INVALID_LEVEL' // Invalid
    },
    expectedStatus: 400
  },

  customerProvidedFabric: {
    name: '✅ Customer Provided Fabric',
    data: {
      customerId: CONFIG.CUSTOMER_ID,
      tailorId: CONFIG.TAILOR_ID,
      measurementProfileId: '00000000-0000-0000-0000-000000000001',
      garmentType: 'Traditional Dress',
      fabricChoice: 'CUSTOMER_PROVIDED',
      specialInstructions: 'I will bring ankara fabric',
      totalAmount: 350.00,
      estimatedDelivery: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      urgencyLevel: 'STANDARD'
    },
    expectedStatus: 201
  },

  rushOrder: {
    name: '✅ Rush Order with Express Urgency',
    data: {
      customerId: CONFIG.CUSTOMER_ID,
      tailorId: CONFIG.TAILOR_ID,
      measurementProfileId: '00000000-0000-0000-0000-000000000001',
      garmentType: 'Shirt',
      fabricChoice: 'TAILOR_SOURCED',
      specialInstructions: 'Need this urgently for wedding',
      totalAmount: 200.00,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      urgencyLevel: 'EXPRESS'
    },
    expectedStatus: 201
  }
};

// Make HTTP request
async function makeRequest(endpoint, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, CONFIG.API_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? require('https') : require('http');
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run a single test
async function runTest(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  
  console.log('\n📤 Request Data:');
  console.log(JSON.stringify(scenario.data, null, 2));

  try {
    const result = await makeRequest(
      '/api/orders/create',
      'POST',
      scenario.data,
      {
        'Authorization': `Bearer ${CONFIG.AUTH_TOKEN}`
      }
    );

    console.log('\n📥 Response:');
    console.log(`Status: ${result.status}`);
    console.log('Data:', JSON.stringify(result.data, null, 2));

    const passed = result.status === scenario.expectedStatus;
    
    if (passed) {
      console.log(`\n✅ PASSED: Got expected status ${scenario.expectedStatus}`);
      
      if (result.status === 201) {
        console.log(`✅ Order Created: ${result.data.orderNumber || 'N/A'}`);
        console.log(`✅ Order ID: ${result.data.orderId || 'N/A'}`);
      }
    } else {
      console.log(`\n❌ FAILED: Expected ${scenario.expectedStatus}, got ${result.status}`);
    }

    return { passed, scenario: scenario.name, result };
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    return { passed: false, scenario: scenario.name, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         ORDER CREATION FLOW - AUTOMATED TEST SUITE                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  console.log('\n📋 Configuration:');
  console.log(`API URL: ${CONFIG.API_URL}`);
  console.log(`Customer ID: ${CONFIG.CUSTOMER_ID}`);
  console.log(`Tailor ID: ${CONFIG.TAILOR_ID}`);
  console.log(`Auth Token: ${CONFIG.AUTH_TOKEN ? '***' + CONFIG.AUTH_TOKEN.slice(-8) : 'NOT SET'}`);

  // Validate configuration
  if (CONFIG.CUSTOMER_ID.includes('REPLACE') || 
      CONFIG.TAILOR_ID.includes('REPLACE') || 
      CONFIG.AUTH_TOKEN.includes('REPLACE')) {
    console.log('\n❌ ERROR: Please configure the test by setting environment variables:');
    console.log('   CUSTOMER_ID - A valid customer UUID');
    console.log('   TAILOR_ID - A valid tailor UUID');
    console.log('   AUTH_TOKEN - A valid authentication token');
    console.log('\nExample:');
    console.log('   CUSTOMER_ID="uuid" TAILOR_ID="uuid" AUTH_TOKEN="token" node test-order-creation.js');
    process.exit(1);
  }

  const results = [];
  
  // Run each scenario
  for (const [key, scenario] of Object.entries(SCENARIOS)) {
    const result = await runTest(scenario);
    results.push(result);
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                          TEST SUMMARY                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  console.log('\n📊 Detailed Results:\n');
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${result.scenario}`);
  });
  
  console.log('\n');
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Order creation flow is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  SOME TESTS FAILED. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

