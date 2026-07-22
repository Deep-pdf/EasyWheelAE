const WebSocket = require('ws');

const url = 'ws://127.0.0.1:23435';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('--- STARTING BRIDGE SERVER INTEGRATION TESTS ---');

  // 1. Connect first client
  console.log('\n[TEST 1] Connecting primary client...');
  const client1 = new WebSocket(url);
  
  await new Promise((resolve, reject) => {
    client1.on('open', resolve);
    client1.on('error', reject);
  });
  console.log('Primary client connected successfully.');

  // 2. Set up message listener for responses
  client1.on('message', (data) => {
    const response = JSON.parse(data.toString('utf8'));
    console.log(`[CLIENT RECEIVED] ID: ${response.requestId}, Success: ${response.success}, ErrorCode: ${response.errorCode || 'none'}, Message: ${response.message}, Time: ${response.executionTime}ms`);
  });

  // 3. Send Ping
  console.log('\n[TEST 2] Sending ping command...');
  const pingReq = {
    version: 1,
    requestId: 'ping-id-123',
    timestamp: new Date().toISOString(),
    command: 'ping',
    parameters: null,
    profile: 'After Effects'
  };
  client1.send(JSON.stringify(pingReq));
  await wait(1000);

  // 4. Send Echo
  console.log('\n[TEST 3] Sending echo command...');
  const echoReq = {
    version: 1,
    requestId: 'echo-id-456',
    timestamp: new Date().toISOString(),
    command: 'echo',
    parameters: { project: 'EasyWheelAE', version: 'Phase 10' },
    profile: 'After Effects'
  };
  client1.send(JSON.stringify(echoReq));
  await wait(1000);

  // 5. Send Easy Ease Command
  console.log('\n[TEST 4] Sending easy_ease command...');
  const easyEaseReq = {
    version: 1,
    requestId: 'ease-id-789',
    timestamp: new Date().toISOString(),
    command: 'easy_ease',
    parameters: {},
    profile: 'After Effects'
  };
  client1.send(JSON.stringify(easyEaseReq));
  await wait(1000);

  // 6. Test Concurrency Limit (Connect secondary client)
  console.log('\n[TEST 5] Attempting secondary client connection (should be closed with 4001)...');
  const client2 = new WebSocket(url);
  
  const rejectionPromise = new Promise((resolve) => {
    client2.on('close', (code, reason) => {
      resolve({ success: true, code, reason: reason.toString() });
    });
    client2.on('error', (err) => {
      resolve({ success: false, error: err });
    });
    // If it stays open for 3 seconds, fail it
    wait(3000).then(() => resolve({ success: false, error: 'Socket remained open' }));
  });

  const result = await rejectionPromise;
  if (result.success && result.code === 4001) {
    console.log(`SUCCESS: Secondary connection was rejected correctly. Code: ${result.code}, Reason: ${result.reason}`);
  } else {
    console.log('FAIL: Secondary connection was not rejected with 4001.', result);
  }

  // 7. Cleanup
  console.log('\n[CLEANUP] Disconnecting primary client...');
  client1.close();
  await wait(500);
  console.log('--- INTEGRATION TESTS FINISHED ---');
}

runTest().catch(console.error);
