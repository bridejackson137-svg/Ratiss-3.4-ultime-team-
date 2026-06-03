fetch('http://localhost:3000/api/cognitive/batch-synthetise', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    intention: "Test",
    mode: "indexed",
    activeProviderId: "qwen",
    apiKey: "dummy",
    selectedModel: "qwen-plus"
  })
}).then(async res => {
  console.log('STATUS:', res.status);
  console.log('BODY:', await res.text());
}).catch(e => console.error(e));
