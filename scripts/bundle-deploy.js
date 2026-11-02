import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const deployDir = path.join(rootDir, 'deploy_package');
const distDir = path.join(rootDir, 'dist');
const backendDir = path.join(rootDir, 'backend');

console.log('🚀 Preparing InfinityFree deployment package...');

// 1. Clean and recreate deploy_package
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}
fs.mkdirSync(deployDir, { recursive: true });

// Helper: copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Copy frontend dist files to deploy root
console.log('📦 Copying built frontend...');
copyDir(distDir, deployDir);

// 3. Copy backend modules
console.log('🐘 Copying PHP backend modules...');
const backendFolders = ['api', 'config', 'models', 'database', 'uploads'];
for (const folder of backendFolders) {
  const src = path.join(backendDir, folder);
  const dest = path.join(deployDir, folder);
  copyDir(src, dest);
}

// 4. Copy .env with InfinityFree credentials
console.log('🔐 Configuring .env for InfinityFree MySQL...');
const envSrc = path.join(backendDir, '.env');
const envDest = path.join(deployDir, '.env');
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
}

// 5. Create production .htaccess in deploy_package root
console.log('⚙️ Creating production .htaccess with security rules...');
const htaccessContent = `<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # 1. Protect sensitive files (.env, sqlite, sql files)
    <FilesMatch "^(\\..*|.*\\.sqlite|.*\\.sql)$">
        Order allow,deny
        Deny from all
    </FilesMatch>

    # 2. Block direct access to PHP internal folders
    RewriteRule ^(config|models)/ - [F,L]

    # 3. Clean API URL Rewrites
    RewriteRule ^api/attendees/?$ api/attendees.php [L,QSA]
    RewriteRule ^api/config/?$ api/config.php [L,QSA]
    RewriteRule ^api/upload/?$ api/upload.php [L,QSA]
    RewriteRule ^api/status/?$ api/status.php [L,QSA]
    RewriteRule ^api/?$ api/index.php [L,QSA]

    # 4. Serve existing files directly
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    # 5. SPA Route Fallback
    RewriteRule ^ index.html [L]
</IfModule>

# Disable Directory Browsing
Options -Indexes
`;
fs.writeFileSync(path.join(deployDir, '.htaccess'), htaccessContent, 'utf-8');

// 6. Create uploads .htaccess to prevent PHP script execution
const uploadsHtaccess = `# Disable execution of PHP scripts in uploads directory
<FilesMatch "\\.(php|php5|phtml|phar)$">
    Order allow,deny
    Deny from all
</FilesMatch>
`;
fs.writeFileSync(path.join(deployDir, 'uploads', '.htaccess'), uploadsHtaccess, 'utf-8');

console.log('✅ Deployment package created successfully at:');
console.log('👉', deployDir);
