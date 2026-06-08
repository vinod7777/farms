<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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
        $stmt = $pdo->query("
            SELECT a.id, a.user_id, u.email, u.role, a.action, a.details, a.ip_address, a.created_at 
            FROM audit_logs a 
            LEFT JOIN users u ON a.user_id = u.id 
            ORDER BY a.created_at DESC 
            LIMIT 100
        ");
        $logs = $stmt->fetchAll();
        echo json_encode(["logs" => $logs]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database query error: " . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
