<?php
require_once __DIR__ . '/../config/database.php';

echo "Testing connection to: " . getenv('DB_HOST') . " (DB: " . getenv('DB_DATABASE') . ")\n";

try {
    $host = getenv('DB_HOST');
    $port = getenv('DB_PORT') ?: 3306;
    $dbname = getenv('DB_DATABASE');
    $user = getenv('DB_USERNAME');
    $pass = getenv('DB_PASSWORD');

    $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
    ];

    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "🎉 SUCCESS: Connected to InfinityFree MySQL database!\n";
    $stmt = $pdo->query("SELECT VERSION()");
    echo "MySQL Version: " . $stmt->fetchColumn() . "\n";
} catch (PDOException $e) {
    echo "⚠️ Connection result: " . $e->getMessage() . "\n";
}

