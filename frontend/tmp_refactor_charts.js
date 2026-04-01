const fs = require('fs');
const path = require('path');

const targetFiles = [
    "app/sales/reports/page.jsx",
    "app/purchase/monitoring/page.jsx",
    "app/md/sales/page.jsx",
    "app/md/revenue/page.jsx",
    "app/md/reports/page.jsx",
    "app/md/monitoring/page.jsx",
    "app/md/dashboard/page.jsx",
    "app/md/employee-lookup/page.jsx",
    "app/md/employee-lookup/[id]/page.jsx",
    "app/md/clients/page.jsx"
];

for (const rel of targetFiles) {
    const filePath = path.join(__dirname, rel);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        continue;
    }
    
    let text = fs.readFileSync(filePath, 'utf8');
    
    // Check if ChartWrapper is already imported
    if (!text.includes('ChartWrapper')) {
        const depth = rel.split('/').length - 1;
        const upStr = '../'.repeat(depth);
        const importStr = `import ChartWrapper from '${upStr}components/shared/ChartWrapper';\n`;
        
        // Remove ResponsiveContainer from import
        text = text.replace(/,\s*ResponsiveContainer/g, '');
        text = text.replace(/ResponsiveContainer,\s*/g, '');
        text = text.replace(/\{\s*ResponsiveContainer\s*\}/g, '');
        
        // Insert new import
        text = text.replace(/(import\s*\{[^}]*\}\s*from\s*['"]recharts['"];)/, `$1\n${importStr}`);
        
        // Replace Tags
        text = text.replace(/<ResponsiveContainer/g, '<ChartWrapper');
        text = text.replace(/<\/ResponsiveContainer>/g, '</ChartWrapper>');
        
        fs.writeFileSync(filePath, text, 'utf8');
        console.log(`Updated ${rel}`);
    } else {
        console.log(`Already updated: ${rel}`);
    }
}
