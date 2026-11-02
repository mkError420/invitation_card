<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/EventConfig.php';

sendCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'POST') {
    if (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
        $method = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
    } elseif (isset($_POST['_method'])) {
        $method = strtoupper($_POST['_method']);
    }
}

$model = new EventConfigModel();

try {
    switch ($method) {
        case 'GET':
            $config = $model->get();
            echo json_encode(['success' => true, 'data' => $config], JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
        case 'PUT':
            $input = getJsonInput();
            if (empty($input)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No configuration payload provided'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $updated = $model->update($input);
            echo json_encode([
                'success' => true,
                'message' => 'Configuration updated successfully',
                'data' => $updated
            ], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
