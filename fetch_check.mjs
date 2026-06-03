fetch('http://localhost:3000/api/cognitive/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: "tu es Ratiss v6, dis bonjour", providerId: "gemini" })
}).then(async res => {
  console.log('STATUS:', res.status);
  console.log('BODY:', await res.text());
}).catch(e => console.error(e));
