<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'db.php';
require_once 'auth.php';

// Authenticate user - must be logged in (farmer or admin)
$user = getAuthenticatedUser($pdo);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["error" => "No file uploaded or upload error occurred."]);
    exit;
}

$file = $_FILES['document'];
$max_size = 10 * 1024 * 1024; // 10MB limit
if ($file['size'] > $max_size) {
    http_response_code(400);
    echo json_encode(["error" => "File size exceeds 10MB limit."]);
    exit;
}

$allowed_types = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'application/pdf' => 'pdf'
];

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime_type = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!array_key_exists($mime_type, $allowed_types)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid file format. Only JPG, PNG, WEBP, and PDF are allowed."]);
    exit;
}

$extension = $allowed_types[$mime_type];
$filename = uniqid('doc_', true) . '.' . $extension;

$upload_dir = __DIR__ . '/admin/uploads/';
if (!is_dir($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

$filepath = $upload_dir . $filename;

if (move_uploaded_file($file['tmp_name'], $filepath)) {
    // Return relative URL that can be accessed via the web server
    $url = 'admin/uploads/' . $filename;
    echo json_encode(["success" => true, "url" => $url]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to save file to server."]);
}
