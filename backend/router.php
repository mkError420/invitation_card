<?php
/**
 * PHP Built-in Server Router for Local Development & Testing
 * Run: php -S 0.0.0.0:8000 backend/router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Helper for sending CORS headers immediately
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-HTTP-Method-Override");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Serve uploaded files
if (str_starts_with($uri, '/uploads/')) {
    $filePath = __DIR__ . $uri;
    if (file_exists($filePath) && is_file($filePath)) {
        $mime = mime_content_type($filePath);
        header("Content-Type: {$mime}");
        readfile($filePath);
        exit;
    }
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'File not found']);
    exit;
}

// Route API requests
$cleanUri = preg_replace('/\.php$/', '', $uri);

switch ($cleanUri) {
    case '/api/attendees':
        require __DIR__ . '/api/attendees.php';
        exit;
    case '/api/config':
        require __DIR__ . '/api/config.php';
        exit;
    case '/api/upload':
        require __DIR__ . '/api/upload.php';
        exit;
    case '/api/status':
        require __DIR__ . '/api/status.php';
        exit;
    case '/api':
    case '/api/':
    case '/api/index':
        require __DIR__ . '/api/index.php';
        exit;
    case '/api/init':
    case '/database/init':
        require __DIR__ . '/database/init.php';
        exit;
}

// Check if request points to an existing file in backend/
$backendFile = __DIR__ . $uri;
if (file_exists($backendFile) && is_file($backendFile)) {
    return false; // let built-in server handle it
}

// Default root response
if ($uri === '/' || $uri === '') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'message' => 'Invitation Card PHP Backend Server',
        'status' => 'online',
        'apiRoot' => '/api',
        'docs' => '/api/index.php',
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// 404 for unknown routes
http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => false, 'error' => 'Endpoint not found: ' . $uri]);
exit;

