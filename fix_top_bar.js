const fs = require('fs');

let content = fs.readFileSync('components/joyful/top-bar.tsx', 'utf8');

// replace useState import
content = content.replace("import { useEffect, useState } from 'react'", "import { useEffect, useState } from 'react'\nimport { useTheme } from 'next-themes'");

// replace states
content = content.replace("const [isDark, setIsDark] = useState(false)", "const { theme, setTheme, systemTheme } = useTheme()\n  const [mounted, setMounted] = useState(false)\n\n  useEffect(() => setMounted(true), [])");

// replace toggle function
content = content.replace(/const toggleTheme = \(\) => \{[\s\S]*?setIsDark\(next\)\n  \}/, `const toggleTheme = () => {
    const currentTheme = theme === 'system' ? systemTheme : theme
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }`);

// remove the useEffect that checks isDark
content = content.replace(/useEffect\(\(\) => \{\n    setIsDark\(document\.documentElement\.classList\.contains\('dark'\)\)\n  \}, \[\]\)/, "");

// find where isDark is used and replace with actual logic
// Line 85 is: {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
// Let's just use `isDark` variable locally for rendering:
content = content.replace(/const { user } = useAuth\(\)/, `const { user } = useAuth()
  const isDark = mounted && (theme === 'dark' || (theme === 'system' && systemTheme === 'dark'))`);

fs.writeFileSync('components/joyful/top-bar.tsx', content);
