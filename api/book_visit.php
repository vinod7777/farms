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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON payload"]);
    exit;
}

$visitor_name = trim($input['visitor_name'] ?? '');
$visitor_phone = trim($input['visitor_phone'] ?? '');
$visitor_email = trim($input['visitor_email'] ?? '');
$visit_date = trim($input['visit_date'] ?? '');
$farm_id = isset($input['farm_id']) && is_numeric($input['farm_id']) ? intval($input['farm_id']) : null;

if (empty($visitor_name) || empty($visitor_phone) || empty($visit_date)) {
    http_response_code(400);
    echo json_encode(["error" => "Name, Phone, and Visit Date are required"]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO farm_visits (farm_id, visitor_name, visitor_phone, visitor_email, visit_date, status)
        VALUES (:farm_id, :visitor_name, :visitor_phone, :visitor_email, :visit_date, 'pending')
    ");
    
    $stmt->execute([
        'farm_id' => $farm_id,
        'visitor_name' => $visitor_name,
        'visitor_phone' => $visitor_phone,
        'visitor_email' => $visitor_email,
        'visit_date' => $visit_date
    ]);
    
    echo json_encode(["success" => true, "message" => "Visit booked successfully!"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to book visit. Please try again."]);
}
