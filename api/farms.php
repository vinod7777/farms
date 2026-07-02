<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'db.php';
require_once 'auth.php';

// Authenticate user - must be logged in (farmer or admin)
$user = getAuthenticatedUser($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (
        empty($data['type']) || 
        empty($data['boundary_polygon']) || 
        empty($data['total_area_acres']) || 
        empty($data['name']) || 
        empty($data['farming_type']) ||
        empty($data['soil_type']) ||
        empty($data['water_source']) ||
        empty($data['irrigation_system']) ||
        empty($data['crop_insurance']) ||
        empty($data['visit_slot'])
    ) {
        http_response_code(400);
        echo json_encode(["error" => "All fields (name, type, farming_type, soil_type, water_source, irrigation_system, crop_insurance, visit_slot) are required"]);
        exit;
    }
    
    $type = $data['type'];
    $polygon_wkt = $data['boundary_polygon'];
    $acres = floatval($data['total_area_acres']);
    if ($acres <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Total area must be a positive number"]);
        exit;
    }
    
    if (!in_array($type, ['management_support', 'leased_to_platform'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid registration type"]);
        exit;
    }
    
    try {
        $pdo->beginTransaction();
        
        // Anti-Fraud check: Ensure this polygon does not overlap with any pending/verified farm
        $overlap_check = $pdo->prepare("
            SELECT id FROM farms 
            WHERE status IN ('pending', 'verified') 
            AND ST_Intersects(boundary_polygon, ST_GeomFromText(:polygon, 4326)) = 1
        ");
        
        try {
            $overlap_check->execute(['polygon' => $polygon_wkt]);
            $overlapping_farm = $overlap_check->fetch();
        } catch (PDOException $e) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid geometry format. Must be a valid POLYGON((lng lat, ...)) in WGS 84."]);
            exit;
        }
        
        if ($overlapping_farm) {
            logAudit($pdo, $user['id'], 'SPATIAL_OVERLAP_FRAUD', "Attempted to register land overlapping with existing Farm ID: {$overlapping_farm['id']}");
            http_response_code(400);
            echo json_encode(["error" => "Registration rejected. The submitted boundary overlaps with an already registered/verified farm."]);
            exit;
        }
        
        // Insert new farm with all details
        $stmt = $pdo->prepare("
            INSERT INTO farms (farmer_id, name, type, farming_type, soil_type, water_source, irrigation_system, crop_insurance, visit_slot, lease_years, boundary_polygon, status, total_area_acres, document_urls) 
            VALUES (:farmer_id, :name, :type, :farming_type, :soil_type, :water_source, :irrigation_system, :crop_insurance, :visit_slot, :lease_years, ST_GeomFromText(:polygon, 4326), 'pending', :acres, :document_urls)
        ");
        $stmt->execute([
            'farmer_id' => $user['farmer_id'],
            'name' => $data['name'],
            'type' => $type,
            'farming_type' => $data['farming_type'],
            'soil_type' => $data['soil_type'] ?? null,
            'water_source' => $data['water_source'] ?? null,
            'irrigation_system' => $data['irrigation_system'] ?? null,
            'crop_insurance' => $data['crop_insurance'] ?? 'no',
            'visit_slot' => $data['visit_slot'] ?? null,
            'lease_years' => !empty($data['lease_years']) ? intval($data['lease_years']) : null,
            'polygon' => $polygon_wkt,
            'acres' => $acres,
            'document_urls' => isset($data['document_urls']) ? json_encode($data['document_urls']) : null
        ]);
        
        $farm_id = $pdo->lastInsertId();
        
        logAudit($pdo, $user['id'], 'FARM_SUBMITTED', "Submitted farm ID $farm_id for verification (Acreage: $acres)");
        
        $pdo->commit();
        
        echo json_encode([
            "success" => true,
            "message" => "Farm submitted successfully and is pending admin verification.",
            "farm_id" => $farm_id
        ]);
        
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
    exit;
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Farmers only see their own farms, Admins can see all if they request, but here we isolate by user role.
        if ($user['role'] === 'admin') {
            $stmt = $pdo->query("
                SELECT f.id, f.farmer_id, f.name, f.type, f.farming_type, f.soil_type, f.water_source, f.irrigation_system, f.crop_insurance, f.visit_slot, f.lease_years, ST_AsText(f.boundary_polygon) as boundary_polygon, f.status, f.total_area_acres, f.created_at,
                       l.id as lease_id, l.terms_json as lease_terms, l.status as lease_status, l.start_date as lease_start, l.end_date as lease_end
                FROM farms f
                LEFT JOIN lease_agreements l ON f.id = l.farm_id
            ");
        } else {
            $stmt = $pdo->prepare("
                SELECT f.id, f.farmer_id, f.name, f.type, f.farming_type, f.soil_type, f.water_source, f.irrigation_system, f.crop_insurance, f.visit_slot, f.lease_years, ST_AsText(f.boundary_polygon) as boundary_polygon, f.status, f.total_area_acres, f.created_at,
                       l.id as lease_id, l.terms_json as lease_terms, l.status as lease_status, l.start_date as lease_start, l.end_date as lease_end
                FROM farms f
                LEFT JOIN lease_agreements l ON f.id = l.farm_id
                WHERE f.farmer_id = :farmer_id
            ");
            $stmt->execute(['farmer_id' => $user['farmer_id']]);
        }
        
        $farms = $stmt->fetchAll();
        echo json_encode(["farms" => $farms]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database query error: " . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
