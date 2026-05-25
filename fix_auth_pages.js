const fs = require('fs');

for (const file of ['app/(auth)/login/page.tsx', 'app/(auth)/signup/page.tsx']) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/@\/components\/auth\/AuthShell/g, "@/components/joyful/auth/AuthShell");
  fs.writeFileSync(file, content);
}
console.log('Fixed Auth Pages');
