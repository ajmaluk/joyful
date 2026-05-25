const fs = require('fs');

const content = fs.readFileSync('app/(marketing)/page.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('black') || lines[i].includes('#000')) {
    console.log(`Line ${i + 1}: ${lines[i].trim()}`);
  }
}
