<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Attendee.php';

sendCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
// Support method override via POST parameter or header
if ($method === 'POST') {
    if (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
        $method = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
    } elseif (isset($_POST['_method'])) {
        $method = strtoupper($_POST['_method']);
    }
}

$model = new AttendeeModel();
$id = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                $attendee = $model->getById($id);
                if (!$attendee) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Attendee not found'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                echo json_encode(['success' => true, 'data' => $attendee], JSON_UNESCAPED_UNICODE);
            } else {
                $search = $_GET['search'] ?? null;
                $list = $model->getAll($search);
                echo json_encode(['success' => true, 'count' => count($list), 'data' => $list], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = getJsonInput();

            // Check if action specified in body or query
            $act = $action ?: ($input['action'] ?? null);

            if ($act === 'save' || $act === 'upsert') {
                $saved = $model->save($input);
                http_response_code(200);
                echo json_encode(['success' => true, 'data' => $saved], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'batch' || $act === 'import') {
                $items = $input['attendees'] ?? [];
                $mode = ($input['mode'] ?? 'append') === 'replace' ? 'replace' : 'append';
                if (!is_array($items)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid attendees list format'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $result = $model->batchImport($items, $mode);
                echo json_encode([
                    'success' => true,
                    'message' => 'Batch import completed',
                    'count' => count($result),
                    'data' => $result
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'reset') {
                $result = $model->resetToDefault();
                echo json_encode([
                    'success' => true,
                    'message' => 'Reset to default attendees completed',
                    'count' => count($result),
                    'data' => $result
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'delete') {
                $targetId = $id ?: ($input['id'] ?? null);
                if (!$targetId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Attendee ID is required for deletion'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $deleted = $model->delete($targetId);
                echo json_encode(['success' => true, 'deleted' => $deleted], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'update' || ($id && $act !== 'create')) {
                $targetId = $id ?: ($input['id'] ?? null);
                if (!$targetId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Attendee ID is required for update'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $updated = $model->update($targetId, $input);
                if (!$updated) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Attendee not found'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                echo json_encode(['success' => true, 'data' => $updated], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Normal Create
            $created = $model->create($input);
            http_response_code(201);
            echo json_encode(['success' => true, 'data' => $created], JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            $input = getJsonInput();
            $targetId = $id ?: ($input['id'] ?? null);
            if (!$targetId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Attendee ID is required for update'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $updated = $model->update($targetId, $input);
            if (!$updated) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Attendee not found'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            echo json_encode(['success' => true, 'data' => $updated], JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            $targetId = $id;
            if (!$targetId) {
                $input = getJsonInput();
                $targetId = $input['id'] ?? null;
            }
            if (!$targetId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Attendee ID is required for deletion'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $deleted = $model->delete($targetId);
            echo json_encode(['success' => true, 'deleted' => $deleted], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
