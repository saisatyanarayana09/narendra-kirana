const fs = require('fs');
const path = require('path');

// Recursively find all .tsx and .ts files in src/
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file === 'node_modules' || file === '.expo') continue;
      walkDir(filePath, fileList);
    } else if (/\.(tsx?|ts)$/.test(file) && !file.includes('.test.')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

let totalFixed = 0;
const files = walkDir(path.join(__dirname, 'src'));

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix shadow* style props -> boxShadow
  // Pattern: find groups of shadowColor + shadowOffset + shadowOpacity + shadowRadius
  // and replace with a single boxShadow line
  // This regex handles StyleSheet.create style blocks
  
  const shadowBlockRegex = /shadowColor:\s*['"]([^'"]+)['"]\s*,\s*\n\s*shadowOffset:\s*\{\s*width:\s*(\d+)\s*,\s*height:\s*(\d+)\s*\}\s*,\s*\n\s*shadowOpacity:\s*([\d.]+)\s*,\s*\n\s*shadowRadius:\s*(\d+)\s*,/g;
  
  const newContent = content.replace(shadowBlockRegex, (match, color, w, h, opacity, radius) => {
    // Parse color and apply opacity
    let boxShadowColor;
    if (color.startsWith('#')) {
      // Convert hex to rgba with opacity
      const hex = color.replace('#', '');
      let r, g, b;
      if (hex.length === 3) {
        r = parseInt(hex[0]+hex[0], 16);
        g = parseInt(hex[1]+hex[1], 16);
        b = parseInt(hex[2]+hex[2], 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      boxShadowColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else if (color.startsWith('rgba')) {
      boxShadowColor = color; // already rgba, opacity baked in
    } else {
      boxShadowColor = color;
    }
    
    return `boxShadow: '${w}px ${h}px ${radius}px ${boxShadowColor}',`;
  });

  if (newContent !== content) {
    content = newContent;
    changed = true;
  }

  // Also fix standalone elevation: N (Android shadow) - keep as is, it's still valid
  // But remove any leftover shadow* that aren't part of a full block
  // (individual shadowColor without the full set are orphaned and cause warnings)

  if (changed) {
    fs.writeFileSync(filePath, content);
    totalFixed++;
    console.log(`Fixed: ${path.relative(__dirname, filePath)}`);
  }
}

console.log(`\nDone. Fixed ${totalFixed} files.`);
