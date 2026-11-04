<?php
require_once __DIR__ . '/../config/database.php';

class AttendeeModel {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    /**
     * Map database row (snake_case) to client schema (camelCase)
     */
    public static function formatRow(array $row): array {
        return [
            'id' => (string)($row['id'] ?? ''),
            'regNo' => (string)($row['reg_no'] ?? ''),
            'name' => (string)($row['name'] ?? ''),
            'school' => (string)($row['school'] ?? ''),
            'district' => (string)($row['district'] ?? ''),
            'guests' => (string)($row['guests'] ?? '১'),
            'phone' => (string)($row['phone'] ?? ''),
            'photoUrl' => (string)($row['photo_url'] ?? ''),
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }

    /**
     * Get all attendees, optionally filtered by search keyword
     */
    public function getAll(?string $search = null): array {
        if ($search && trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $stmt = $this->db->prepare("
                SELECT * FROM attendees 
                WHERE name LIKE :s1 OR reg_no LIKE :s2 OR school LIKE :s3 OR district LIKE :s4 OR phone LIKE :s5
                ORDER BY created_at ASC
            ");
            $stmt->execute([
                ':s1' => $term,
                ':s2' => $term,
                ':s3' => $term,
                ':s4' => $term,
                ':s5' => $term,
            ]);
        } else {
            $stmt = $this->db->query("SELECT * FROM attendees ORDER BY created_at ASC");
        }

        $rows = $stmt->fetchAll();
        return array_map([self::class, 'formatRow'], $rows);
    }

    /**
     * Get attendee by ID
     */
    public function getById(string $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM attendees WHERE id = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::formatRow($row) : null;
    }

    /**
     * Calculate next sequential registration number in Bengali digits (First In, First ID: ০০০১, ০০০২...)
     */
    public function getNextRegNo(): string {
        $stmt = $this->db->query("SELECT reg_no FROM attendees");
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $bnToEn = [
            '০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4',
            '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9'
        ];
        $enToBn = [
            '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪',
            '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯'
        ];

        $maxNum = 0;
        foreach ($rows as $reg) {
            $digits = preg_replace('/\D/', '', strtr((string)$reg, $bnToEn));
            if ($digits !== '') {
                $val = (int)$digits;
                if ($val > $maxNum) {
                    $maxNum = $val;
                }
            }
        }
        $nextNum = $maxNum + 1;
        $padded = str_pad((string)$nextNum, 4, '0', STR_PAD_LEFT);
        return strtr($padded, $enToBn);
    }

    /**
     * Upsert / Save attendee (create if not found, update if exists)
     */
    public function save(array $data): array {
        $id = !empty($data['id']) ? (string)$data['id'] : 'att-' . round(microtime(true) * 1000);
        $data['id'] = $id;

        $regNo = trim((string)($data['regNo'] ?? $data['reg_no'] ?? ''));
        if (empty($regNo)) {
            $regNo = $this->getNextRegNo();
            $data['regNo'] = $regNo;
        }

        $driver = $this->db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $name = trim((string)($data['name'] ?? ''));
            $school = (string)($data['school'] ?? '');
            $district = (string)($data['district'] ?? '');
            $guests = (string)($data['guests'] ?? '১');
            $phone = (string)($data['phone'] ?? '');
            $photoUrl = (string)($data['photoUrl'] ?? $data['photo_url'] ?? '');

            if (empty($name)) {
                throw new InvalidArgumentException('Attendee name is required');
            }

            $stmt = $this->db->prepare("
                INSERT INTO attendees (id, reg_no, name, school, district, guests, phone, photo_url, created_at, updated_at)
                VALUES (:id, :reg_no, :name, :school, :district, :guests, :phone, :photo_url, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                    reg_no = VALUES(reg_no),
                    name = VALUES(name),
                    school = VALUES(school),
                    district = VALUES(district),
                    guests = VALUES(guests),
                    phone = VALUES(phone),
                    photo_url = VALUES(photo_url),
                    updated_at = CURRENT_TIMESTAMP
            ");

            $stmt->execute([
                ':id' => $id,
                ':reg_no' => $regNo,
                ':name' => $name,
                ':school' => $school,
                ':district' => $district,
                ':guests' => $guests,
                ':phone' => $phone,
                ':photo_url' => $photoUrl,
            ]);

            return $this->getById($id) ?? [];
        }

        // SQLite / generic fallback
        if ($this->getById($id)) {
            $updated = $this->update($id, $data);
            if ($updated) return $updated;
        }
        return $this->create($data);
    }

    /**
     * Create a new attendee
     */
    public function create(array $data): array {
        $id = !empty($data['id']) ? (string)$data['id'] : 'att-' . round(microtime(true) * 1000);
        $regNo = trim((string)($data['regNo'] ?? $data['reg_no'] ?? ''));
        if (empty($regNo)) {
            $regNo = $this->getNextRegNo();
        }
        $name = trim((string)($data['name'] ?? ''));
        $school = (string)($data['school'] ?? '');
        $district = (string)($data['district'] ?? '');
        $guests = (string)($data['guests'] ?? '১');
        $phone = (string)($data['phone'] ?? '');
        $photoUrl = (string)($data['photoUrl'] ?? $data['photo_url'] ?? '');

        if (empty($name)) {
            throw new InvalidArgumentException('Attendee name is required');
        }

        $stmt = $this->db->prepare("
            INSERT INTO attendees (id, reg_no, name, school, district, guests, phone, photo_url, created_at, updated_at)
            VALUES (:id, :reg_no, :name, :school, :district, :guests, :phone, :photo_url, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ");

        $stmt->execute([
            ':id' => $id,
            ':reg_no' => $regNo,
            ':name' => $name,
            ':school' => $school,
            ':district' => $district,
            ':guests' => $guests,
            ':phone' => $phone,
            ':photo_url' => $photoUrl,
        ]);

        return $this->getById($id) ?? [];
    }

    /**
     * Update existing attendee
     */
    public function update(string $id, array $data): ?array {
        $current = $this->getById($id);
        if (!$current) {
            return null;
        }

        $regNo = array_key_exists('regNo', $data) ? $data['regNo'] : ($data['reg_no'] ?? $current['regNo']);
        $name = array_key_exists('name', $data) ? trim($data['name']) : $current['name'];
        $school = array_key_exists('school', $data) ? $data['school'] : $current['school'];
        $district = array_key_exists('district', $data) ? $data['district'] : $current['district'];
        $guests = array_key_exists('guests', $data) ? $data['guests'] : $current['guests'];
        $phone = array_key_exists('phone', $data) ? $data['phone'] : $current['phone'];
        $photoUrl = array_key_exists('photoUrl', $data) ? $data['photoUrl'] : ($data['photo_url'] ?? $current['photoUrl']);

        $stmt = $this->db->prepare("
            UPDATE attendees SET
                reg_no = :reg_no,
                name = :name,
                school = :school,
                district = :district,
                guests = :guests,
                phone = :phone,
                photo_url = :photo_url,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        ");

        $stmt->execute([
            ':id' => $id,
            ':reg_no' => $regNo,
            ':name' => $name,
            ':school' => $school,
            ':district' => $district,
            ':guests' => $guests,
            ':phone' => $phone,
            ':photo_url' => $photoUrl,
        ]);

        return $this->getById($id);
    }

    /**
     * Delete attendee by ID
     */
    public function delete(string $id): bool {
        // Also remove uploaded photo if it was a local server upload
        try {
            $stmt = $this->db->prepare("SELECT photo_url FROM attendees WHERE id = :id OR reg_no = :id2 LIMIT 1");
            $stmt->execute([':id' => $id, ':id2' => $id]);
            $row = $stmt->fetch();
            if ($row && !empty($row['photo_url'])) {
                $photo = $row['photo_url'];
                if (strpos($photo, 'uploads/') !== false) {
                    $parts = explode('uploads/', $photo);
                    $filename = end($parts);
                    $filepath = __DIR__ . '/../../uploads/' . basename($filename);
                    if (file_exists($filepath)) {
                        @unlink($filepath);
                    }
                }
            }
        } catch (Exception $e) {
            // ignore file cleanup error
        }

        $stmt = $this->db->prepare("DELETE FROM attendees WHERE id = :id OR reg_no = :id2");
        $stmt->execute([':id' => $id, ':id2' => $id]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Batch import (replace or append)
     */
    public function batchImport(array $attendees, string $mode = 'append'): array {
        $this->db->beginTransaction();
        try {
            if ($mode === 'replace') {
                $this->db->exec("DELETE FROM attendees");
            }

            $stmt = $this->db->prepare("
                INSERT INTO attendees (id, reg_no, name, school, district, guests, phone, photo_url, created_at, updated_at)
                VALUES (:id, :reg_no, :name, :school, :district, :guests, :phone, :photo_url, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ");

            $idx = 1;
            foreach ($attendees as $att) {
                $id = !empty($att['id']) ? (string)$att['id'] : 'att-' . round(microtime(true) * 1000) . '-' . ($idx++);
                $regNo = (string)($att['regNo'] ?? $att['reg_no'] ?? '');
                $name = trim((string)($att['name'] ?? ''));
                if (empty($name)) continue;

                $school = (string)($att['school'] ?? '');
                $district = (string)($att['district'] ?? '');
                $guests = (string)($att['guests'] ?? '১');
                $phone = (string)($att['phone'] ?? '');
                $photoUrl = (string)($att['photoUrl'] ?? $att['photo_url'] ?? '');

                // In case of conflict with existing ID in append mode:
                if ($mode === 'append' && $this->getById($id)) {
                    $id = 'att-' . round(microtime(true) * 1000) . '-' . ($idx++);
                }

                $stmt->execute([
                    ':id' => $id,
                    ':reg_no' => $regNo,
                    ':name' => $name,
                    ':school' => $school,
                    ':district' => $district,
                    ':guests' => $guests,
                    ':phone' => $phone,
                    ':photo_url' => $photoUrl,
                ]);
            }

            $this->db->commit();
            return $this->getAll();
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    /**
     * Reset to default or sample dataset
     */
    public function resetToDefault(): array {
        $defaults = [
            [
                'id' => 'att-1',
                'regNo' => '০০০১',
                'name' => 'মো: নাজমুল আহসান',
                'school' => 'রংপুর জেলা স্কুল',
                'district' => 'রংপুর সদর, রংপুর',
                'guests' => '২',
                'phone' => '০১৭XXXXXXXX',
                'photoUrl' => '',
            ],
            [
                'id' => 'att-2',
                'regNo' => '০০০২',
                'name' => 'প্রকৌ. তৌহিদুল ইসলাম',
                'school' => 'রংপুর জিলা স্কুল',
                'district' => 'মিঠাপুকুর, রংপুর',
                'guests' => '১',
                'phone' => '০১৮১২৩৪৫৬৭৮',
                'photoUrl' => '',
            ],
            [
                'id' => 'att-3',
                'regNo' => '০০০৩',
                'name' => 'ড. মাহমুদুল হাসান',
                'school' => 'রংপুর সরকারি কলেজ',
                'district' => 'পীরগঞ্জ, রংপুর',
                'guests' => '৩',
                'phone' => '০১৯৮৭৬৫৪৩২১',
                'photoUrl' => '',
            ],
            [
                'id' => 'att-4',
                'regNo' => '০০০৪',
                'name' => 'আব্দুর রহিম সরকার',
                'school' => 'কাউনিয়া পাইলট উচ্চ বিদ্যালয়',
                'district' => 'কাউনিয়া, রংপুর',
                'guests' => '২',
                'phone' => '০১৬১১২২৩৩৪৪',
                'photoUrl' => '',
            ],
        ];

        return $this->batchImport($defaults, 'replace');
    }
}

