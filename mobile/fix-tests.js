const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('src/**/*.test.tsx', { cwd: 's:/smart-kirana/mobile', absolute: true });
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  content = content.replace(/^import\s+([A-Z]\w+)\s+from\s+(['"])(?:\.\/|\.\.\/)[^'"]+(['"]);/gm, (match, p1, p2, p3) => {
    return `import { ${p1} } from ${p2}${match.split('from ')[1].slice(1)}`;
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
    changedCount++;
  }
});
console.log('Total files fixed:', changedCount);
