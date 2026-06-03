const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/\(JSON FORMAT REQUIRED\)/g, '(json FORMAT REQUIRED)');
fs.writeFileSync('server.ts', code);
console.log("Replaced JSON with json in server.ts");
