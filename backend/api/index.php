<?php
require_once __DIR__ . '/../config/database.php';

sendCorsHeaders();

echo json_encode([
    'name' => 'Invitation Card Management API',
    'version' => '1.0.0',
    'description' => 'PHP Backend for Reunion Invitation Card Generator & Attendee Manager',
    'endpoints' => [
        'GET /api/status.php' => 'Health check & database connection status',
        'GET /api/attendees.php' => 'List all attendees (support ?search=...)',
        'GET /api/attendees.php?id={id}' => 'Get single attendee details',
        'POST /api/attendees.php' => 'Create a new attendee',
        'PUT /api/attendees.php?id={id}' => 'Update existing attendee',
        'DELETE /api/attendees.php?id={id}' => 'Delete attendee',
        'POST /api/attendees.php?action=batch' => 'Batch import attendees (mode: replace | append)',
        'POST /api/attendees.php?action=reset' => 'Reset attendees to default dataset',
        'GET /api/config.php' => 'Get event configuration',
        'POST /api/config.php' => 'Update event configuration',
        'POST /api/upload.php' => 'Upload attendee photo (multipart or base64)',
    ],
    'supportedDatabases' => ['sqlite', 'mysql'],
    'status' => 'online',
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

