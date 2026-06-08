<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once '../db.php';
require_once '../auth.php';

// Authenticate user - must be Admin
$adminUser = getAuthenticatedUser($pdo, 'admin');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, farmer_id, email, role, status, contact_number, created_at FROM users ORDER BY created_at DESC");
        $users = $stmt->fetchAll();
        echo json_encode(["users" => $users]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database query error: " . $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Suspend or Activate user
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['id']) || empty($data['status'])) {
        http_response_code(400);
        echo json_encode(["error" => "id and status are required"]);
        exit;
    }
    
    $user_id = intval($data['id']);
    $status = $data['status'];
    
    if (!in_array($status, ['active', 'suspended'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid status value. Must be 'active' or 'suspended'."]);
        exit;
    }
    
    // Prevent self-suspension
    if ($user_id === $adminUser['id']) {
        http_response_code(400);
        echo json_encode(["error" => "You cannot suspend your own admin account."]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE users SET status = :status WHERE id = :id");
        $stmt->execute(['status' => $status, 'id' => $user_id]);
        
        logAudit($pdo, $adminUser['id'], 'USER_STATUS_UPDATED', "Updated user ID $user_id status to '$status'");
        
        echo json_encode(["success" => true, "message" => "User status updated to '$status' successfully."]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database update failed: " . $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Reset password
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['id']) || empty($data['new_password'])) {
        http_response_code(400);
        echo json_encode(["error" => "id and new_password are required"]);
        exit;
    }
    
    $user_id = intval($data['id']);
    $new_password = $data['new_password'];
    
    try {
        $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("UPDATE users SET password_hash = :hash WHERE id = :id");
        $stmt->execute(['hash' => $password_hash, 'id' => $user_id]);
        
        logAudit($pdo, $adminUser['id'], 'USER_PASSWORD_RESET', "Forced password reset for user ID $user_id");
        
        echo json_encode(["success" => true, "message" => "User password successfully reset."]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to reset password: " . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
