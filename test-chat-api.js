/**
 * Test script to check if order exists and API is working
 */

const orderId = 'ab0e70f4-5476-4187-a79e-c754a98a412d';

// Test 1: Check if order exists via API
async function testOrderAPI() {
  try {
    console.log('Testing order API...');
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}?userId=30000000-0000-0000-0000-000000000002`);
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Order data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Order API Error:', error);
  }
}

// Test 2: Check if messages API is working
async function testMessagesAPI() {
  try {
    console.log('\nTesting messages API...');
    const response = await fetch(`http://localhost:3000/api/orders/${orderId}/messages`);
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Messages data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Messages API Error:', error);
  }
}

// Run tests
(async () => {
  await testOrderAPI();
  await testMessagesAPI();
})();

