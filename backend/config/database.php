<?php
/**
 * Database Connection & Configuration Manager
 * Supports SQLite (default, zero configuration) and MySQL.
 */

// Simple .env parser without external dependencies
function loadEnv($path = __DIR__ . '/../.env') {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (str_contains($line, '=')) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            // Remove surrounding quotes if present
            if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                $val = substr($val, 1, -1);
            }
            if (!array_key_exists($key, $_ENV) && !array_key_exists($key, $_SERVER)) {
                putenv("{$key}={$val}");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}

// Load .env if present
loadEnv();

class Database {
    private static ?PDO $pdo = null;

    public static function getConnection(): PDO {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $connection = getenv('DB_CONNECTION') ?: 'sqlite';

        try {
            if ($connection === 'mysql') {
                $host = getenv('DB_HOST') ?: 'sql101.infinityfree.com';
                $port = getenv('DB_PORT') ?: '3306';
                $dbname = getenv('DB_DATABASE') ?: 'if0_42784359_myscmanagement';
                $username = getenv('DB_USERNAME') ?: 'if0_42784359';
                $password = getenv('DB_PASSWORD') ?: '4naAUPQvgRj3';

                $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_TIMEOUT => 4,
                ];
                self::$pdo = new PDO($dsn, $username, $password, $options);

                if (self::tablesNeedInitMysql(self::$pdo)) {
                    self::initMysqlTables(self::$pdo);
                } else {
                    self::ensureMysqlColumns(self::$pdo);
                }
            } else {
                // SQLite
                $dbDir = __DIR__ . '/../database';
                if (!is_dir($dbDir)) {
                    mkdir($dbDir, 0777, true);
                }
                $sqliteFile = getenv('DB_DATABASE') ?: 'database.sqlite';
                if (!str_contains($sqliteFile, '/') && !str_contains($sqliteFile, '\\')) {
                    $sqliteFile = $dbDir . '/' . $sqliteFile;
                }

                $isNewDb = !file_exists($sqliteFile);
                $dsn = "sqlite:" . $sqliteFile;
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ];
                self::$pdo = new PDO($dsn, null, null, $options);
                // Enable foreign keys
                self::$pdo->exec('PRAGMA foreign_keys = ON;');
                // Enable WAL mode for better concurrency
                self::$pdo->exec('PRAGMA journal_mode = WAL;');

                if ($isNewDb || self::tablesNeedInit(self::$pdo)) {
                    self::initSqliteTables(self::$pdo);
                } else {
                    self::ensureSqliteColumns(self::$pdo);
                }
            }

            return self::$pdo;
        } catch (PDOException $e) {
            // If MySQL failed and fallback is possible, try SQLite
            if ($connection === 'mysql') {
                error_log("MySQL connection failed: " . $e->getMessage() . ". Falling back to SQLite.");
                putenv("DB_CONNECTION=sqlite");
                $_ENV['DB_CONNECTION'] = 'sqlite';
                return self::getConnection();
            }

            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    private static function tablesNeedInit(PDO $pdo): bool {
        try {
            $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='attendees'");
            return $stmt->fetchColumn() === false;
        } catch (Exception $e) {
            return true;
        }
    }

    private static function tablesNeedInitMysql(PDO $pdo): bool {
        try {
            $stmt = $pdo->query("SHOW TABLES LIKE 'attendees'");
            return $stmt->fetchColumn() === false;
        } catch (Exception $e) {
            return true;
        }
    }

    public static function ensureMysqlColumns(PDO $pdo): void {
        try {
            $stmt = $pdo->query("SHOW COLUMNS FROM attendees LIKE 'photo_url'");
            if ($stmt->fetchColumn() === false) {
                $pdo->exec("ALTER TABLE attendees ADD COLUMN photo_url LONGTEXT DEFAULT NULL AFTER phone");
            }
        } catch (Exception $e) {
            // ignore
        }
    }

    public static function ensureSqliteColumns(PDO $pdo): void {
        try {
            $cols = $pdo->query("PRAGMA table_info(attendees)")->fetchAll(PDO::FETCH_COLUMN, 1);
            if (!in_array('photo_url', $cols)) {
                $pdo->exec("ALTER TABLE attendees ADD COLUMN photo_url TEXT DEFAULT ''");
            }
        } catch (Exception $e) {
            // ignore
        }
    }

    public static function initMysqlTables(PDO $pdo): void {
        $schemaFile = __DIR__ . '/../database/schema.sql';
        if (file_exists($schemaFile)) {
            $sql = file_get_contents($schemaFile);
            $pdo->exec($sql);
        }
    }

    public static function initSqliteTables(PDO $pdo): void {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS attendees (
                id TEXT PRIMARY KEY,
                reg_no TEXT NOT NULL,
                name TEXT NOT NULL,
                school TEXT DEFAULT '',
                district TEXT DEFAULT '',
                guests TEXT DEFAULT '১',
                phone TEXT DEFAULT '',
                photo_url TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS event_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                header_arc_title TEXT NOT NULL,
                main_title TEXT NOT NULL,
                slogan1 TEXT DEFAULT '',
                slogan2 TEXT DEFAULT '',
                label_reg TEXT DEFAULT 'নিবন্ধন নং',
                label_name TEXT DEFAULT '',
                label_school TEXT DEFAULT '',
                label_district TEXT DEFAULT '',
                label_guests TEXT DEFAULT 'অতিথিঃ ',
                label_phone TEXT DEFAULT '',
                event_date TEXT DEFAULT '১৮ ডিসেম্বর, ২০২৬',
                venue TEXT DEFAULT 'আনান সিটি পার্ক, রংপুর',
                use_custom_banner INTEGER DEFAULT 0,
                show_lanyard_slot INTEGER DEFAULT 1,
                show_cut_marks INTEGER DEFAULT 1,
                photo_scale INTEGER DEFAULT 98,
                photo_offset_y INTEGER DEFAULT 0,
                font_choice TEXT DEFAULT 'kalpurush',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");

        // Seed default config if empty
        $stmt = $pdo->query("SELECT COUNT(*) FROM event_config");
        if ((int)$stmt->fetchColumn() === 0) {
            $pdo->exec("
                INSERT INTO event_config (
                    id, header_arc_title, main_title, slogan1, slogan2,
                    label_reg, label_name, label_school, label_district, label_guests, label_phone,
                    event_date, venue, use_custom_banner, show_lanyard_slot, show_cut_marks, photo_scale, photo_offset_y
                ) VALUES (
                    1,
                    'এসএসসি ৮৮ ব্যাচের বন্ধুদের মিলনমেলা',
                    'বাহের ডাক',
                    'স্মৃতির আলো......বন্ধুত্বের উচ্ছ্বাসে.....',
                    'আমরা আবার এক সাথে',
                    'নিবন্ধন নং',
                    '',
                    '',
                    '',
                    'অতিথিঃ ',
                    '',
                    '১৮ ডিসেম্বর, ২০২৬',
                    'আনান সিটি পার্ক, রংপুর',
                    0,
                    1,
                    1,
                    98,
                    0
                );
            ");
        }
    }
}

/**
 * Handle Cross-Origin Resource Sharing (CORS) and standard JSON response headers
 */
function sendCorsHeaders(): void {
    if (headers_sent()) {
        return;
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    header("Access-Control-Allow-Origin: {$origin}");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-HTTP-Method-Override");
    header("Access-Control-Allow-Credentials: true");

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') {
        http_response_code(200);
        exit;
    }

    header('Content-Type: application/json; charset=utf-8');
}

/**
 * Helper to read JSON request body or POST payload
 */
function getJsonInput(): array {
    $input = file_get_contents('php://input');
    if (!empty($input)) {
        $decoded = json_decode($input, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST;
}
