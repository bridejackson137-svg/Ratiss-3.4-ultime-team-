const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/cognitive/prompt',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${body}`);
  });
});

req.on('error', e => console.error(e));
req.write('{}');
req.end();
