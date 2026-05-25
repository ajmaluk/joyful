const fs = require('fs');

let content = fs.readFileSync('components/joyful/marketing/MarketingChrome.tsx', 'utf8');

content = content.replace(/import \{ readImageAttachment \} from '@\/services\/attachments';/, '');
content = content.replace(/router\.push\('\/builder', \{ state: \{ prompt: request, initialMode: mode, initialAttachments: attachments \} \}\);/, "router.push(`/builder?prompt=${encodeURIComponent(request)}&mode=${mode}`);");

fs.writeFileSync('components/joyful/marketing/MarketingChrome.tsx', content);
console.log('Fixed MarketingChrome again');
