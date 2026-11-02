<?php
require_once __DIR__ . '/../config/database.php';

class EventConfigModel {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public static function formatRow(array $row): array {
        return [
            'headerArcTitle' => (string)($row['header_arc_title'] ?? ''),
            'mainTitle' => (string)($row['main_title'] ?? ''),
            'slogan1' => (string)($row['slogan1'] ?? ''),
            'slogan2' => (string)($row['slogan2'] ?? ''),
            'labelReg' => (string)($row['label_reg'] ?? 'নিবন্ধন নং'),
            'labelName' => (string)($row['label_name'] ?? ''),
            'labelSchool' => (string)($row['label_school'] ?? ''),
            'labelDistrict' => (string)($row['label_district'] ?? ''),
            'labelGuests' => (string)($row['label_guests'] ?? 'অতিথিঃ '),
            'labelPhone' => (string)($row['label_phone'] ?? ''),
            'date' => (string)($row['event_date'] ?? '১৮ ডিসেম্বর, ২০২৬'),
            'venue' => (string)($row['venue'] ?? 'আনান সিটি পার্ক, রংপুর'),
            'useCustomBanner' => (bool)($row['use_custom_banner'] ?? 0),
            'showLanyardSlot' => (bool)($row['show_lanyard_slot'] ?? 1),
            'showCutMarks' => (bool)($row['show_cut_marks'] ?? 1),
            'photoScale' => (int)($row['photo_scale'] ?? 98),
            'photoOffsetY' => (int)($row['photo_offset_y'] ?? 0),
            'fontChoice' => (string)($row['font_choice'] ?? 'solaiman_kalpurush'),
        ];
    }

    public function get(): array {
        $stmt = $this->db->query("SELECT * FROM event_config WHERE id = 1 LIMIT 1");
        $row = $stmt->fetch();
        if ($row) {
            return self::formatRow($row);
        }

        // Default fallback if table was empty
        Database::initSqliteTables($this->db);
        $stmt = $this->db->query("SELECT * FROM event_config WHERE id = 1 LIMIT 1");
        $row = $stmt->fetch();
        return $row ? self::formatRow($row) : [];
    }

    public function update(array $data): array {
        $current = $this->get();

        $headerArcTitle = $data['headerArcTitle'] ?? $data['header_arc_title'] ?? $current['headerArcTitle'];
        $mainTitle = $data['mainTitle'] ?? $data['main_title'] ?? $current['mainTitle'];
        $slogan1 = $data['slogan1'] ?? $current['slogan1'];
        $slogan2 = $data['slogan2'] ?? $current['slogan2'];
        $labelReg = $data['labelReg'] ?? $data['label_reg'] ?? $current['labelReg'];
        $labelName = $data['labelName'] ?? $data['label_name'] ?? $current['labelName'];
        $labelSchool = $data['labelSchool'] ?? $data['label_school'] ?? $current['labelSchool'];
        $labelDistrict = $data['labelDistrict'] ?? $data['label_district'] ?? $current['labelDistrict'];
        $labelGuests = $data['labelGuests'] ?? $data['label_guests'] ?? $current['labelGuests'];
        $labelPhone = $data['labelPhone'] ?? $data['label_phone'] ?? $current['labelPhone'];
        $eventDate = $data['date'] ?? $data['event_date'] ?? $current['date'];
        $venue = $data['venue'] ?? $current['venue'];
        $useCustomBanner = isset($data['useCustomBanner']) ? ($data['useCustomBanner'] ? 1 : 0) : ($current['useCustomBanner'] ? 1 : 0);
        $showLanyardSlot = isset($data['showLanyardSlot']) ? ($data['showLanyardSlot'] ? 1 : 0) : ($current['showLanyardSlot'] ? 1 : 0);
        $showCutMarks = isset($data['showCutMarks']) ? ($data['showCutMarks'] ? 1 : 0) : ($current['showCutMarks'] ? 1 : 0);
        $photoScale = isset($data['photoScale']) ? (int)$data['photoScale'] : $current['photoScale'];
        $photoOffsetY = isset($data['photoOffsetY']) ? (int)$data['photoOffsetY'] : $current['photoOffsetY'];
        $fontChoice = $data['fontChoice'] ?? $data['font_choice'] ?? ($current['fontChoice'] ?? 'solaiman_kalpurush');

        // Check/ensure font_choice column exists
        try {
            $this->db->exec("ALTER TABLE event_config ADD COLUMN font_choice VARCHAR(50) DEFAULT 'solaiman_kalpurush'");
        } catch (Exception $e) {
            // column already exists
        }

        $stmt = $this->db->prepare("
            UPDATE event_config SET
                header_arc_title = :header_arc_title,
                main_title = :main_title,
                slogan1 = :slogan1,
                slogan2 = :slogan2,
                label_reg = :label_reg,
                label_name = :label_name,
                label_school = :label_school,
                label_district = :label_district,
                label_guests = :label_guests,
                label_phone = :label_phone,
                event_date = :event_date,
                venue = :venue,
                use_custom_banner = :use_custom_banner,
                show_lanyard_slot = :show_lanyard_slot,
                show_cut_marks = :show_cut_marks,
                photo_scale = :photo_scale,
                photo_offset_y = :photo_offset_y,
                font_choice = :font_choice,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        ");

        $stmt->execute([
            ':header_arc_title' => $headerArcTitle,
            ':main_title' => $mainTitle,
            ':slogan1' => $slogan1,
            ':slogan2' => $slogan2,
            ':label_reg' => $labelReg,
            ':label_name' => $labelName,
            ':label_school' => $labelSchool,
            ':label_district' => $labelDistrict,
            ':label_guests' => $labelGuests,
            ':label_phone' => $labelPhone,
            ':event_date' => $eventDate,
            ':venue' => $venue,
            ':use_custom_banner' => $useCustomBanner,
            ':show_lanyard_slot' => $showLanyardSlot,
            ':show_cut_marks' => $showCutMarks,
            ':photo_scale' => $photoScale,
            ':photo_offset_y' => $photoOffsetY,
            ':font_choice' => $fontChoice,
        ]);

        return $this->get();
    }
}

