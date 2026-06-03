const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/\{ role: "system", content: systemInstruction \}/g, '{ role: "system", content: systemInstruction + " (JSON FORMAT REQUIRED)" }');
fs.writeFileSync('server.ts', code);
console.log("Replaced systemInstruction lines in server.ts");
