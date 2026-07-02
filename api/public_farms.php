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

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

try {
    // Fetch all farms for the public page, including pending ones as requested
    $stmt = $pdo->query("
        SELECT id, name, type, farming_type, soil_type, water_source, irrigation_system, total_area_acres, status, ST_AsText(boundary_polygon) as boundary_polygon 
        FROM farms 
        ORDER BY created_at DESC
    ");
    $farms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($farms);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to fetch farms."]);
}
