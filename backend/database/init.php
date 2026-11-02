<?php
/**
 * Database Migration and Initializer CLI / Web script
 * Run with: php backend/database/init.php
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Attendee.php';
require_once __DIR__ . '/../models/EventConfig.php';

$isCli = (php_sapi_name() === 'cli');

if (!$isCli) {
    sendCorsHeaders();
}

try {
    $db = Database::getConnection();
    $driver = $db->getAttribute(PDO::ATTR_DRIVER_NAME);

    if ($driver === 'sqlite') {
        Database::initSqliteTables($db);
    } else {
        // For MySQL, load schema.sql and execute
        $schemaPath = __DIR__ . '/schema.sql';
        if (file_exists($schemaPath)) {
            $sql = file_get_contents($schemaPath);
            // Remove comments and execute queries
            $db->exec($sql);
        }
    }

    $attendeeModel = new AttendeeModel();
    $attendees = $attendeeModel->getAll();

    $configModel = new EventConfigModel();
    $config = $configModel->get();

    $report = [
        'success' => true,
        'message' => 'Database initialized and seeded successfully!',
        'driver' => $driver,
        'database' => getenv('DB_DATABASE') ?: ($driver === 'sqlite' ? 'database.sqlite' : 'invitation_db'),
        'attendeesCount' => count($attendees),
        'attendees' => array_map(fn($a) => ['id' => $a['id'], 'regNo' => $a['regNo'], 'name' => $a['name']], $attendees),
        'eventTitle' => $config['mainTitle'] ?? '',
        'eventDate' => $config['date'] ?? '',
        'venue' => $config['venue'] ?? '',
    ];

    if ($isCli) {
        echo "=====================================================\n";
        echo " 🎉 INVITATION CARD BACKEND & DATABASE INITIALIZER\n";
        echo "=====================================================\n";
        echo " Driver:        " . strtoupper($driver) . "\n";
        echo " Database:      " . $report['database'] . "\n";
        echo " Status:        CONNECTED & READY\n";
        echo " Attendees:     " . count($attendees) . " seeded\n";
        echo " Event Title:   " . ($config['mainTitle'] ?? '') . "\n";
        echo " Date:          " . ($config['date'] ?? '') . "\n";
        echo " Venue:         " . ($config['venue'] ?? '') . "\n";
        echo "=====================================================\n";
        echo " All tables and seed records are active!\n";
    } else {
        echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    if ($isCli) {
        echo "❌ Error initializing database: " . $e->getMessage() . "\n";
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit(1);
}

