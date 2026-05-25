const fs = require('fs');
let code = fs.readFileSync('components/layout/left-sidebar.tsx', 'utf8');

// Container
code = code.replace(
  "className={`${expanded ? 'w-56' : 'w-16'} hidden h-full min-h-0 flex-shrink-0 flex-col items-center gap-1 border-r border-border/40 bg-background/95 backdrop-blur py-3 transition-all duration-200 md:flex`}",
  "className={`${expanded ? 'w-56' : 'w-16'} hidden h-full min-h-0 flex-shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 transition-all duration-200 md:flex`}"
);

// Divider
code = code.replace(
  '<div className="h-px bg-border/40" />',
  '<div className="h-px bg-sidebar-border" />'
);

// Button hover generic
code = code.replace(
  /hover:bg-muted\/50 hover:text-foreground/g,
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
);
code = code.replace(
  /hover:bg-muted hover:text-foreground/g,
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
);

// Text muted
code = code.replace(
  /text-muted-foreground/g,
  'text-sidebar-foreground'
);

// Active state
code = code.replace(
  /bg-muted text-foreground shadow-sm/g,
  'bg-background text-foreground shadow-xs'
);

// No projects border
code = code.replace(
  /border-border\/60/g,
  'border-sidebar-border'
);

fs.writeFileSync('components/layout/left-sidebar.tsx', code);
