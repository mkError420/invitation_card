<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Attendee.php';
require_once __DIR__ . '/../models/EventConfig.php';

sendCorsHeaders();

try {
    $db = Database::getConnection();
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);

    $attendeeModel = new AttendeeModel();
    $attendeesCount = count($attendeeModel->getAll());

    $configModel = new EventConfigModel();
    $config = $configModel->get();

    echo json_encode([
        'success' => true,
        'status' => 'healthy',
        'message' => 'Invitation Card PHP Backend is running successfully',
        'driver' => $driver,
        'mysqlError' => Database::$mysqlError,
        'phpVersion' => PHP_VERSION,
        'attendeesCount' => $attendeesCount,
        'eventTitle' => $config['mainTitle'] ?? '',
        'timestamp' => date('c'),
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}

