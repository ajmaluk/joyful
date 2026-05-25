const fs = require('fs');
let content = fs.readFileSync('app/not-found.tsx', 'utf8');
content = content.replace(/to=/g, 'href=');
// Remove any duplicate export default function
// if there are multiple.
fs.writeFileSync('app/not-found.tsx', content);
