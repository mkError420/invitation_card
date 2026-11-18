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
            'isArchived' => !empty($row['is_archived']),
            'archivedAt' => $row['archived_at'] ?? null,
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }

    /**
     * Get all active attendees (or all if includeArchived=true), optionally filtered by search keyword
     */
    public function getAll(?string $search = null, bool $includeArchived = false): array {
        $archiveClause = $includeArchived ? "1=1" : "(is_archived = 0 OR is_archived IS NULL)";
        if ($search && trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $stmt = $this->db->prepare("
                SELECT * FROM attendees 
                WHERE {$archiveClause} AND (name LIKE :s1 OR reg_no LIKE :s2 OR school LIKE :s3 OR district LIKE :s4 OR phone LIKE :s5)
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
            $stmt = $this->db->query("SELECT * FROM attendees WHERE {$archiveClause} ORDER BY created_at ASC");
        }

        $rows = $stmt->fetchAll();
        $result = array_map([self::class, 'formatRow'], $rows);

        $bnToEn = [
            '০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4',
            '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9'
        ];
        usort($result, function ($a, $b) use ($bnToEn) {
            $numA = (int)preg_replace('/\D/', '', strtr((string)($a['regNo'] ?? ''), $bnToEn));
            $numB = (int)preg_replace('/\D/', '', strtr((string)($b['regNo'] ?? ''), $bnToEn));
            return $numA <=> $numB;
        });

        return $result;
    }

    /**
     * Get all archived attendees, optionally filtered by search keyword
     */
    public function getArchived(?string $search = null): array {
        if ($search && trim($search) !== '') {
            $term = '%' . trim($search) . '%';
            $stmt = $this->db->prepare("
                SELECT * FROM attendees 
                WHERE is_archived = 1 AND (name LIKE :s1 OR reg_no LIKE :s2 OR school LIKE :s3 OR district LIKE :s4 OR phone LIKE :s5)
                ORDER BY archived_at DESC, updated_at DESC
            ");
            $stmt->execute([
                ':s1' => $term,
                ':s2' => $term,
                ':s3' => $term,
                ':s4' => $term,
                ':s5' => $term,
            ]);
        } else {
            $stmt = $this->db->query("SELECT * FROM attendees WHERE is_archived = 1 ORDER BY archived_at DESC, updated_at DESC");
        }

        $rows = $stmt->fetchAll();
        return array_map([self::class, 'formatRow'], $rows);
    }

    /**
     * Get attendee by ID
     */
    public function getById(string $id, bool $includeArchived = false): ?array {
        $archiveClause = $includeArchived ? "" : " AND (is_archived = 0 OR is_archived IS NULL)";
        $stmt = $this->db->prepare("SELECT * FROM attendees WHERE id = :id {$archiveClause} LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? self::formatRow($row) : null;
    }

    /**
     * Calculate next sequential registration number in Bengali digits (First In, First ID: ০০০১, ০০০২...)
     */
    public function getNextRegNo(): string {
        $stmt = $this->db->query("SELECT reg_no FROM attendees WHERE is_archived = 0 OR is_archived IS NULL");
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
     * Archive attendee by ID or regNo and re-adjust remaining registration numbers sequentially (০০০১, ০০০২...)
     */
    public function archive(string $id, ?string $regNo = null): bool {
        $targetReg = $regNo ?: $id;
        $stmt = $this->db->prepare("
            UPDATE attendees 
            SET is_archived = 1, archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
            WHERE id = :id OR id = :regNo OR reg_no = :id2 OR reg_no = :regNo2
        ");
        $stmt->execute([':id' => $id, ':regNo' => $targetReg, ':id2' => $id, ':regNo2' => $targetReg]);
        $archived = $stmt->rowCount() > 0;

        if ($archived) {
            $this->resequenceRegNumbers();
        }

        return $archived;
    }

    /**
     * Restore archived attendee and re-sequence registration numbers
     */
    public function restore(string $id): ?array {
        $target = $this->getById($id, true);
        if (!$target) return null;

        $nextReg = $this->getNextRegNo();
        $stmt = $this->db->prepare("
            UPDATE attendees 
            SET is_archived = 0, archived_at = NULL, reg_no = :reg_no, updated_at = CURRENT_TIMESTAMP 
            WHERE id = :id
        ");
        $stmt->execute([
            ':id' => $id,
            ':reg_no' => $nextReg,
        ]);

        if ($stmt->rowCount() > 0) {
            $this->resequenceRegNumbers();
            return $this->getById($id, false);
        }

        return null;
    }

    /**
     * Restore all archived attendees back to active list
     */
    public function restoreAll(): array {
        $stmt = $this->db->query("SELECT id FROM attendees WHERE is_archived = 1");
        $archivedIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($archivedIds as $archivedId) {
            $this->restore($archivedId);
        }
        return $this->getAll();
    }

    /**
     * Delete attendee: defaults to moving to Archive. If $permanent is true, permanently deletes.
     */
    public function delete(string $id, ?string $regNo = null, bool $permanent = false): bool {
        if ($permanent) {
            return $this->deletePermanently($id, $regNo);
        }
        return $this->archive($id, $regNo);
    }

    /**
     * Permanently delete attendee by ID or regNo from database and clean up photo
     */
    public function deletePermanently(string $id, ?string $regNo = null): bool {
        $targetReg = $regNo ?: $id;
        // Also remove uploaded photo if it was a local server upload
        try {
            $stmt = $this->db->prepare("SELECT photo_url FROM attendees WHERE id = :id OR id = :regNo OR reg_no = :id2 OR reg_no = :regNo2 LIMIT 1");
            $stmt->execute([':id' => $id, ':regNo' => $targetReg, ':id2' => $id, ':regNo2' => $targetReg]);
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

        $stmt = $this->db->prepare("DELETE FROM attendees WHERE id = :id OR id = :regNo OR reg_no = :id2 OR reg_no = :regNo2");
        $stmt->execute([':id' => $id, ':regNo' => $targetReg, ':id2' => $id, ':regNo2' => $targetReg]);
        $deleted = $stmt->rowCount() > 0;

        if ($deleted) {
            $this->resequenceRegNumbers();
        }

        return $deleted;
    }

    /**
     * Clear all attendees currently in archive
     */
    public function clearArchive(): int {
        $stmt = $this->db->query("SELECT id, reg_no FROM attendees WHERE is_archived = 1");
        $rows = $stmt->fetchAll();
        $count = 0;
        foreach ($rows as $row) {
            if ($this->deletePermanently($row['id'], $row['reg_no'])) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Re-sequence all existing attendees' registration numbers sequentially: ০০০১, ০০০২, ০০০৩...
     */
    public function resequenceRegNumbers(): array {
        $rows = $this->getAll();
        if (empty($rows)) {
            return [];
        }

        $bnToEn = [
            '০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4',
            '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9'
        ];
        $enToBn = [
            '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪',
            '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯'
        ];

        // Sort rows by numerical regNo to maintain relative sequence
        usort($rows, function ($a, $b) use ($bnToEn) {
            $numA = (int)preg_replace('/\D/', '', strtr((string)($a['regNo'] ?? ''), $bnToEn));
            $numB = (int)preg_replace('/\D/', '', strtr((string)($b['regNo'] ?? ''), $bnToEn));
            return $numA <=> $numB;
        });

        $stmt = $this->db->prepare("UPDATE attendees SET reg_no = :reg_no WHERE id = :id");
        $i = 1;
        foreach ($rows as $row) {
            $padded = str_pad((string)$i, 4, '0', STR_PAD_LEFT);
            $newRegNo = strtr($padded, $enToBn);
            $stmt->execute([
                ':reg_no' => $newRegNo,
                ':id' => $row['id']
            ]);
            $i++;
        }

        return $this->getAll();
    }

    /**
     * Reorder attendees by updating their reg_no and sequence
     */
    public function reorder(array $attendees): array {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("UPDATE attendees SET reg_no = :reg_no, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            foreach ($attendees as $att) {
                $id = !empty($att['id']) ? (string)$att['id'] : null;
                $regNo = (string)($att['regNo'] ?? $att['reg_no'] ?? '');
                if ($id && $regNo) {
                    $stmt->execute([
                        ':reg_no' => $regNo,
                        ':id' => $id,
                    ]);
                }
            }
            $this->db->commit();
            return $this->getAll();
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
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

