# cPanel Deployment Packaging Script
# This script bundles the built React frontend + PHP backend into a single ready-to-upload ZIP file.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "1. Building fresh frontend..." -ForegroundColor Cyan
npm run build

$deployDir = Join-Path $projectRoot "cpanel_deploy"
$zipPath = Join-Path $projectRoot "cpanel_deploy.zip"

Write-Host "2. Preparing cpanel_deploy directory..." -ForegroundColor Cyan
if (Test-Path $deployDir) {
    Remove-Item -Recurse -Force $deployDir
}
New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

# Copy Frontend Build
Write-Host "3. Copying frontend dist files..." -ForegroundColor Cyan
Copy-Item -Recurse -Force "$projectRoot\dist\*" $deployDir

# Copy Backend Folders
Write-Host "4. Copying PHP backend files..." -ForegroundColor Cyan
Copy-Item -Recurse -Force "$projectRoot\backend\api" "$deployDir\api"
Copy-Item -Recurse -Force "$projectRoot\backend\config" "$deployDir\config"
Copy-Item -Recurse -Force "$projectRoot\backend\models" "$deployDir\models"

# Create Uploads directory
$uploadsDir = Join-Path $deployDir "uploads"
New-Item -ItemType Directory -Force -Path $uploadsDir | Out-Null

# Copy .env and schema.sql
Copy-Item -Force "$projectRoot\backend\.env" "$deployDir\.env"
Copy-Item -Force "$projectRoot\backend\database\schema.sql" "$deployDir\schema.sql"

# Create production .htaccess for cPanel / Apache
Write-Host "5. Creating Apache .htaccess..." -ForegroundColor Cyan
$htaccessContent = @"
# InfinityFree & cPanel Optimized .htaccess
RewriteEngine On
RewriteBase /

# Prevent directory listing without using 'Options' keyword (which InfinityFree blocks)
IndexIgnore *

# Protect sensitive files (.env, .sqlite, etc.)
<FilesMatch "^\.(env|git|sqlite)">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order allow,deny
        Deny from all
    </IfModule>
</FilesMatch>

# Allow direct access to existing files and folders (JS, CSS, images, PHP scripts)
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Clean API routing to PHP endpoints
RewriteRule ^api/attendees/?$ api/attendees.php [L,QSA]
RewriteRule ^api/config/?$ api/config.php [L,QSA]
RewriteRule ^api/upload/?$ api/upload.php [L,QSA]
RewriteRule ^api/status/?$ api/status.php [L,QSA]
RewriteRule ^api/?$ api/index.php [L,QSA]

# React SPA Fallback to index.html
RewriteRule ^ index.html [L]
"@

Set-Content -Path "$deployDir\.htaccess" -Value $htaccessContent -Encoding UTF8

# Create ZIP archive
Write-Host "6. Creating cpanel_deploy.zip..." -ForegroundColor Cyan
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}
Compress-Archive -Path "$deployDir\*" -DestinationPath $zipPath -Force

Write-Host "=====================================================" -ForegroundColor Green
Write-Host " 🎉 SUCCESS: cPanel Deployment Package Ready!" -ForegroundColor Green
Write-Host " File: $zipPath" -ForegroundColor Green
$zipSizeMB = [math]::Round(((Get-Item $zipPath).Length / 1MB), 2)
Write-Host " Size: $zipSizeMB MB" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
