<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Attendee.php';

sendCorsHeaders();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Use POST.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$uploadsDir = realpath(__DIR__ . '/../uploads') ?: (__DIR__ . '/../uploads');
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0777, true);
}

$allowedMimeTypes = [
    'image/jpeg' => 'jpg',
    'image/jpg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

$maxFileSize = 10 * 1024 * 1024; // 10 MB

try {
    $uploadedFilename = null;
    $attendeeId = $_POST['attendeeId'] ?? $_GET['attendeeId'] ?? null;

    // Case 1: Standard multipart/form-data upload
    if (isset($_FILES['photo']) || isset($_FILES['file']) || isset($_FILES['image'])) {
        $file = $_FILES['photo'] ?? ($_FILES['file'] ?? $_FILES['image']);

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE => 'Uploaded file exceeds upload_max_filesize directive in php.ini',
                UPLOAD_ERR_FORM_SIZE => 'Uploaded file exceeds MAX_FILE_SIZE directive in HTML form',
                UPLOAD_ERR_PARTIAL => 'The uploaded file was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'File upload stopped by extension',
            ];
            throw new Exception($errorMessages[$file['error']] ?? 'File upload failed');
        }

        if ($file['size'] > $maxFileSize) {
            throw new Exception('File size exceeds the 10MB limit');
        }

        // Verify MIME type with finfo
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);

        if (!array_key_exists($mime, $allowedMimeTypes)) {
            throw new Exception("Invalid image format ($mime). Allowed formats: JPG, PNG, WEBP, GIF");
        }

        $ext = $allowedMimeTypes[$mime];
        $uploadedFilename = 'photo_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $destination = $uploadsDir . DIRECTORY_SEPARATOR . $uploadedFilename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            throw new Exception('Failed to save uploaded image to disk');
        }
    } else {
        // Case 2: Base64 JSON payload
        $input = getJsonInput();
        $attendeeId = $attendeeId ?: ($input['attendeeId'] ?? null);
        $dataUri = $input['image'] ?? ($input['photo'] ?? ($input['photoUrl'] ?? null));

        if (!$dataUri) {
            throw new Exception('No photo or base64 image data provided in request');
        }

        if (preg_match('/^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/i', $dataUri, $matches)) {
            $format = strtolower($matches[1]);
            $base64Data = $matches[2];
            $ext = ($format === 'jpeg') ? 'jpg' : $format;

            $binary = base64_decode($base64Data);
            if ($binary === false) {
                throw new Exception('Invalid base64 encoding');
            }

            if (strlen($binary) > $maxFileSize) {
                throw new Exception('Image size exceeds 10MB limit');
            }

            $uploadedFilename = 'photo_' . time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
            $destination = $uploadsDir . DIRECTORY_SEPARATOR . $uploadedFilename;

            if (file_put_contents($destination, $binary) === false) {
                throw new Exception('Failed to save decoded image to disk');
            }
        } else {
            throw new Exception('Invalid base64 image data URL format');
        }
    }

    $publicUrl = '/uploads/' . $uploadedFilename;

    // If attendeeId was provided, update the attendee directly in database
    if ($attendeeId) {
        $attendeeModel = new AttendeeModel();
        $attendeeModel->update($attendeeId, ['photoUrl' => $publicUrl]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Image uploaded successfully',
        'filename' => $uploadedFilename,
        'url' => $publicUrl,
        'attendeeId' => $attendeeId,
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
