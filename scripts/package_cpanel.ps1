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

# Create production .htaccess for cPanel / InfinityFree / Apache
Write-Host "5. Creating Apache .htaccess..." -ForegroundColor Cyan
$htaccessContent = @"
# InfinityFree & Apache Safe .htaccess (No BOM, No Options keyword)
RewriteEngine On

# Clean API routing to PHP endpoints
RewriteRule ^api/attendees/?$ api/attendees.php [L,QSA]
RewriteRule ^api/config/?$ api/config.php [L,QSA]
RewriteRule ^api/upload/?$ api/upload.php [L,QSA]
RewriteRule ^api/status/?$ api/status.php [L,QSA]
RewriteRule ^api/?$ api/index.php [L,QSA]

# Allow direct access to existing files and folders (JS, CSS, images, fonts, PHP scripts, uploads)
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# React SPA Fallback to index.html
RewriteRule ^ index.html [L]
"@

# Write UTF-8 WITHOUT BOM (Byte Order Mark) so Apache/InfinityFree does not crash
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText("$deployDir\.htaccess", $htaccessContent.Trim() + "`n", $utf8NoBom)

# Create ZIP archive
Write-Host "6. Creating cpanel_deploy.zip..." -ForegroundColor Cyan
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}
$tarExe = Get-Command "tar.exe" -ErrorAction SilentlyContinue
if ($tarExe) {
    & tar.exe -a -c -f $zipPath -C $deployDir .
} else {
    Compress-Archive -Path "$deployDir\*" -DestinationPath $zipPath -Force
}

Write-Host "=====================================================" -ForegroundColor Green
Write-Host " 🎉 SUCCESS: cPanel Deployment Package Ready!" -ForegroundColor Green
Write-Host " File: $zipPath" -ForegroundColor Green
$zipSizeMB = [math]::Round(((Get-Item $zipPath).Length / 1MB), 2)
Write-Host " Size: $zipSizeMB MB" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
