<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'db.php';
require_once 'auth.php';

$user = getAuthenticatedUser($pdo);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT * FROM user_addresses WHERE user_id = :user_id ORDER BY created_at DESC");
        $stmt->execute(['user_id' => $user['id']]);
        $addresses = $stmt->fetchAll();
        echo json_encode(["success" => true, "addresses" => $addresses]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch addresses: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['full_name']) || empty($data['mobile']) || empty($data['house']) || empty($data['area'])) {
        http_response_code(400);
        echo json_encode(["error" => "Full name, mobile, house, and area are required"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO user_addresses (user_id, full_name, mobile, alternate_mobile, house, area) VALUES (:user_id, :full_name, :mobile, :alternate_mobile, :house, :area)");
        $stmt->execute([
            'user_id' => $user['id'],
            'full_name' => $data['full_name'],
            'mobile' => $data['mobile'],
            'alternate_mobile' => $data['alternate_mobile'] ?? null,
            'house' => $data['house'],
            'area' => $data['area']
        ]);
        
        $newAddressId = $pdo->lastInsertId();
        
        $fetchStmt = $pdo->prepare("SELECT * FROM user_addresses WHERE id = :id");
        $fetchStmt->execute(['id' => $newAddressId]);
        $newAddress = $fetchStmt->fetch();
        
        echo json_encode(["success" => true, "address" => $newAddress, "message" => "Address saved successfully!"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to save address: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
