const http = require('http');

function testServer() {
  console.log('🔍 Quick server test...');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    timeout: 5000
  };
  
  const req = http.request(options, (res) => {
    console.log(`✅ Server responded with status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Response data:', data);
    });
  });
  
  req.on('error', (err) => {
    console.error('❌ Server test failed:', err.message);
  });
  
  req.on('timeout', () => {
    console.error('❌ Server test timed out');
    req.destroy();
  });
  
  req.end();
}

testServer();

