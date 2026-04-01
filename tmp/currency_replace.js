const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      let dirPath = path.join(dir, f);
      let stat = fs.statSync(dirPath);
      if (stat.isDirectory()) {
        walk(dirPath, callback);
      } else {
        callback(dirPath);
      }
    });
  } catch (e) {
    console.error(`Error walking ${dir}: ${e.message}`);
  }
}

const rootDir = 'frontend/app'; // Relative path since we are in c:\Projects\CRM-

console.log(`Starting walk in ${rootDir}...`);
let totalChecked = 0;
let totalUpdated = 0;

walk(rootDir, (filePath) => {
  totalChecked++;
  if (filePath.endsWith('.jsx') || filePath.endsWith('.js') || filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace $ not followed by {
    let newContent = content.replace(/\$(?!\{)/g, '₹');
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath}`);
      totalUpdated++;
    }
  }
});

console.log(`Finished. Checked ${totalChecked} files, updated ${totalUpdated}.`);
