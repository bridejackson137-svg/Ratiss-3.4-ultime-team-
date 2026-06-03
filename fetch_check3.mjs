fetch('http://localhost:3000/api/cognitive/scan-models', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    providerId: "qwen",
    apiKey: "dummy"
  })
}).then(async res => {
  console.log('STATUS:', res.status);
  console.log('BODY:', await res.text());
}).catch(e => console.error(e));
