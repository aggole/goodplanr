const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`);

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

const itemsToBackup = [
    'config',
    'lib',
    'pages',
    'public',
    'scripts',
    'styles',
    'templates',
    'utils',
    'create-template.js',
    'next.config.ts',
    'package.json',
    'postcss.config.js',
    'tailwind.config.js',
    'tsconfig.json',
    'README.md'
];

console.log(`Backing up to ${backupDir}...`);

try {
    itemsToBackup.forEach(item => {
        const source = path.join(__dirname, '..', item);
        const dest = path.join(backupDir, item);

        if (fs.existsSync(source)) {
            console.log(`Copying ${item}...`);
            // Use cp -R for recursive copy, preserving attributes if possible
            execSync(`cp -R "${source}" "${dest}"`);
        } else {
            console.warn(`Warning: ${item} not found.`);
        }
    });
    console.log('Backup complete!');
} catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
}
