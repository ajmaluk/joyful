const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./app').concat(walk('./components/joyful')).concat(walk('./hooks/joyful')).concat(walk('./lib'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('"use client"') || content.includes("'use client'")) {
    return;
  }
  
  if (
    content.includes('useState(') ||
    content.includes('useEffect(') ||
    content.includes('useRef(') ||
    content.includes('useCallback(') ||
    content.includes('useMemo(') ||
    content.includes('useRouter()') ||
    content.includes('usePathname()') ||
    content.includes('useParams()') ||
    content.includes('useAuth()') ||
    content.includes('useTypingCycle(') ||
    content.includes('createContext')
  ) {
    fs.writeFileSync(file, '"use client";\n\n' + content);
    console.log('Added use client to', file);
  }
});

