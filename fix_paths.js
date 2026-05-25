const fs = require('fs');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('app');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // hooks/useAuth -> lib/auth-context
  if (content.includes('@/hooks/useAuth')) {
    content = content.replace(/@\/hooks\/useAuth/g, '@/lib/auth-context');
    changed = true;
  }
  // services/firebase -> lib/firebase
  if (content.includes('@/services/firebase')) {
    content = content.replace(/@\/services\/firebase/g, '@/lib/firebase');
    changed = true;
  }
  // useLocation -> usePathname
  if (content.includes('useLocation')) {
    content = content.replace(/useLocation/g, 'usePathname');
    content = content.replace(/react-router-dom/g, 'next/navigation');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated paths in ${file}`);
  }
}
