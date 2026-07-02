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

require_once '../db.php';
require_once '../auth.php';

// Authenticate user - must be Admin
$adminUser = getAuthenticatedUser($pdo, 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (
    empty($data['boundary_polygon']) || 
    empty($data['total_area_acres']) || 
    empty($data['name']) || 
    empty($data['farming_type']) ||
    empty($data['soil_type']) ||
    empty($data['water_source']) ||
    empty($data['irrigation_system']) ||
    empty($data['crop_insurance']) ||
    empty($data['lease_years'])
) {
    http_response_code(400);
    echo json_encode(["error" => "All fields are required to list a farm for rent."]);
    exit;
}

$polygon_wkt = $data['boundary_polygon'];
$acres = floatval($data['total_area_acres']);
if ($acres <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Total area must be a positive number"]);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // Insert new farm directly as verified and rentable
    $stmt = $pdo->prepare("
        INSERT INTO farms (farmer_id, name, type, farming_type, soil_type, water_source, irrigation_system, crop_insurance, visit_slot, lease_years, boundary_polygon, status, total_area_acres, is_rentable, document_urls) 
        VALUES (:farmer_id, :name, 'leased_to_platform', :farming_type, :soil_type, :water_source, :irrigation_system, :crop_insurance, NULL, :lease_years, ST_GeomFromText(:polygon, 4326), 'verified', :acres, 1, :document_urls)
    ");
    
    // We use the admin's email or a special tag as the farmer_id for platform-owned rentals
    $stmt->execute([
        'farmer_id' => 'ADMIN_RENTAL',
        'name' => $data['name'],
        'farming_type' => $data['farming_type'],
        'soil_type' => $data['soil_type'],
        'water_source' => $data['water_source'],
        'irrigation_system' => $data['irrigation_system'],
        'crop_insurance' => $data['crop_insurance'],
        'lease_years' => intval($data['lease_years']),
        'polygon' => $polygon_wkt,
        'acres' => $acres,
        'document_urls' => isset($data['document_urls']) ? (is_string($data['document_urls']) ? $data['document_urls'] : json_encode($data['document_urls'])) : null
    ]);
    
    $farm_id = $pdo->lastInsertId();
    
    $pdo->commit();
    
    echo json_encode(["success" => true, "message" => "Rental farm successfully listed.", "farm_id" => $farm_id]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
