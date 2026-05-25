const fs = require('fs');
let code = fs.readFileSync('app/(app)/builder/[projectId]/page.tsx', 'utf8');

code = code.replace(/from '\.\.\/\.\.\/chat'/g, "from '@/app/chat'");
code = code.replace(/from '\.\.\/\.\.\/file-explorer'/g, "from '@/app/file-explorer'");
code = code.replace(/from '\.\.\/\.\.\/header'/g, "from '@/app/header'");
code = code.replace(/from '\.\.\/\.\.\/logs'/g, "from '@/app/logs'");
code = code.replace(/from '\.\.\/\.\.\/preview'/g, "from '@/app/preview'");

fs.writeFileSync('app/(app)/builder/[projectId]/page.tsx', code);
