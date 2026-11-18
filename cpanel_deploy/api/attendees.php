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
                $attendee = $model->getById($id, true);
                if (!$attendee) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Attendee not found'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                echo json_encode(['success' => true, 'data' => $attendee], JSON_UNESCAPED_UNICODE);
            } else {
                $search = $_GET['search'] ?? null;
                $view = $_GET['view'] ?? null;
                $isArchivedQuery = ($view === 'archived') || (isset($_GET['archived']) && ($_GET['archived'] === '1' || $_GET['archived'] === 'true'));
                if ($isArchivedQuery) {
                    $list = $model->getArchived($search);
                } else {
                    $list = $model->getAll($search);
                }
                echo json_encode(['success' => true, 'count' => count($list), 'data' => $list], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $input = getJsonInput();

            // Check if action specified in body or query
            $act = $action ?: ($input['action'] ?? null);

            if ($act === 'save' || $act === 'upsert' || $act === 'register' || $act === 'public_register' || $act === 'public_save') {
                $saved = $model->save($input);
                http_response_code(200);
                echo json_encode(['success' => true, 'data' => $saved], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'archive') {
                $targetId = $id ?: ($input['id'] ?? null);
                $targetReg = $_GET['regNo'] ?? ($input['regNo'] ?? null);
                if (!$targetId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Attendee ID is required for archive'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $archived = $model->archive($targetId, $targetReg);
                $remaining = $model->getAll();
                $archivedList = $model->getArchived();
                echo json_encode([
                    'success' => true,
                    'archived' => $archived,
                    'data' => $remaining,
                    'archivedList' => $archivedList
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'restore') {
                $targetId = $id ?: ($input['id'] ?? null);
                if (!$targetId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Attendee ID is required for restore'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $restored = $model->restore($targetId);
                if (!$restored) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Archived attendee not found or restore failed'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $remainingArchived = $model->getArchived();
                $activeList = $model->getAll();
                echo json_encode([
                    'success' => true,
                    'message' => 'Attendee restored successfully',
                    'data' => $restored,
                    'active' => $activeList,
                    'archivedList' => $remainingArchived
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'restore_all') {
                $activeList = $model->restoreAll();
                $remainingArchived = $model->getArchived();
                echo json_encode([
                    'success' => true,
                    'message' => 'All archived attendees restored successfully',
                    'active' => $activeList,
                    'archivedList' => $remainingArchived
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'clear_archive') {
                $clearedCount = $model->clearArchive();
                $remainingArchived = $model->getArchived();
                echo json_encode([
                    'success' => true,
                    'message' => 'Archive cleared successfully',
                    'clearedCount' => $clearedCount,
                    'archivedList' => $remainingArchived
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'permanent_delete' || $act === 'delete_permanent') {
                $targetId = $id ?: ($input['id'] ?? null);
                $targetReg = $_GET['regNo'] ?? ($input['regNo'] ?? null);
                if (!$targetId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Attendee ID is required for permanent deletion'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $deleted = $model->deletePermanently($targetId, $targetReg);
                $remaining = $model->getAll();
                $archivedList = $model->getArchived();
                echo json_encode([
                    'success' => true,
                    'deleted' => $deleted,
                    'data' => $remaining,
                    'archivedList' => $archivedList
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($act === 'reorder') {
                $items = $input['attendees'] ?? [];
                if (!is_array($items)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid attendees list format'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $result = $model->reorder($items);
                echo json_encode([
                    'success' => true,
                    'message' => 'Attendees reordered successfully',
                    'count' => count($result),
                    'data' => $result
                ], JSON_UNESCAPED_UNICODE);
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
                $targetReg = $_GET['regNo'] ?? ($input['regNo'] ?? null);
                $isPermanent = !empty($input['permanent']) || !empty($_GET['permanent']);
                if (!$targetId) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Attendee ID is required for deletion'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $deleted = $model->delete($targetId, $targetReg, $isPermanent);
                $remaining = $model->getAll();
                $archivedList = $model->getArchived();
                echo json_encode([
                    'success' => true,
                    'deleted' => $deleted,
                    'data' => $remaining,
                    'archivedList' => $archivedList
                ], JSON_UNESCAPED_UNICODE);
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
            $input = getJsonInput();
            if (!$targetId) {
                $targetId = $input['id'] ?? null;
            }
            $targetReg = $_GET['regNo'] ?? ($input['regNo'] ?? null);
            $isPermanent = !empty($input['permanent']) || !empty($_GET['permanent']);
            if (!$targetId) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Attendee ID is required for deletion'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $deleted = $model->delete($targetId, $targetReg, $isPermanent);
            $remaining = $model->getAll();
            $archivedList = $model->getArchived();
            echo json_encode([
                'success' => true,
                'deleted' => $deleted,
                'data' => $remaining,
                'archivedList' => $archivedList
            ], JSON_UNESCAPED_UNICODE);
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
