<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $farms_stmt = $pdo->query("SELECT id, name, farming_type, total_area_acres, ST_AsText(boundary_polygon) as polygon FROM farms WHERE status = 'verified' AND is_rentable = 1 ORDER BY created_at DESC");
        $farms = $farms_stmt->fetchAll();
        
        $plants_stmt = $pdo->query("SELECT id, farm_id, species, photo_url, ST_AsText(coordinates) as coords FROM plants WHERE status = 'approved' AND is_rentable = 1 ORDER BY planted_at DESC");
        $plants = $plants_stmt->fetchAll();
        
        echo json_encode([
            "success" => true, 
            "rentals" => [
                "farms" => $farms,
                "plants" => $plants
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch rentals: " . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
