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

// Function to calculate and update carbon ledger
function calculateCarbonLedger($pdo, $farm_id) {
    try {
        // 1. Fetch farm details
        $farm_stmt = $pdo->prepare("SELECT id, total_area_acres FROM farms WHERE id = :farm_id");
        $farm_stmt->execute(['farm_id' => $farm_id]);
        $farm = $farm_stmt->fetch();
        if (!$farm) return false;
        
        $acres = floatval($farm['total_area_acres']);
        
        // 2. Fetch plants on this farm
        $plants_stmt = $pdo->prepare("SELECT species, COUNT(*) as count FROM plants WHERE farm_id = :farm_id GROUP BY species");
        $plants_stmt->execute(['farm_id' => $farm_id]);
        $plants = $plants_stmt->fetchAll();
        
        // 3. Compute tree biomass
        $total_tree_biomass_kg = 0.0;
        foreach ($plants as $p) {
            $species = strtolower(trim($p['species']));
            $count = intval($p['count']);
            
            // Biomass weights per species (in kg)
            $weight = 50.0; // Default
            if ($species === 'teak') {
                $weight = 120.0;
            } elseif ($species === 'mango') {
                $weight = 80.0;
            } elseif ($species === 'bamboo') {
                $weight = 40.0;
            }
            
            $total_tree_biomass_kg += ($weight * $count);
        }
        
        // 4. Compute soil biomass based on acreage (e.g. 500 kg per acre)
        $soil_biomass_kg = $acres * 500.0;
        
        $total_biomass_kg = $total_tree_biomass_kg + $soil_biomass_kg;
        
        // 5. Convert biomass to Carbon Stock (tons) - 50% carbon fraction, converted to metric tons
        $carbon_stock_tons = ($total_biomass_kg * 0.5) / 1000.0;
        
        // 6. Calculate Carbon Credits Generated (1 ton carbon stock = 3.67 tons of CO2 equivalent)
        $credits = $carbon_stock_tons * 3.67;
        
        // 7. Calculate market value ($20 per credit)
        $market_value = $credits * 20.00;
        
        // 8. Upsert into carbon_ledgers
        $ledger_stmt = $pdo->prepare("
            INSERT INTO carbon_ledgers (farm_id, calculated_biomass, carbon_credits_generated, market_value) 
            VALUES (:farm_id, :biomass, :credits, :market_value)
            ON DUPLICATE KEY UPDATE 
                calculated_biomass = :biomass, 
                carbon_credits_generated = :credits, 
                market_value = :market_value,
                last_updated = CURRENT_TIMESTAMP
        ");
        
        $ledger_stmt->execute([
            'farm_id' => $farm_id,
            'biomass' => $total_biomass_kg,
            'credits' => $credits,
            'market_value' => $market_value
        ]);
        
        logAudit($pdo, $adminUser['id'], 'CARBON_CALCULATED', "Calculated carbon for Farm ID $farm_id: Biomass = $total_biomass_kg kg, Credits = $credits tons CO2eq, Market Value = $$market_value");
        return true;
        
    } catch (Exception $e) {
        logAudit($pdo, $adminUser['id'], 'CARBON_CALCULATION_FAILED', "Error calculating carbon for Farm ID $farm_id: " . $e->getMessage());
        return false;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $action = $_GET['action'] ?? '';
        
        if ($action === 'ledgers') {
            // Retrieve carbon ledgers (Admin only)
            $stmt = $pdo->query("
                SELECT c.id, c.farm_id, f.farmer_id, f.total_area_acres, c.calculated_biomass, c.carbon_credits_generated, c.market_value, c.last_updated 
                FROM carbon_ledgers c
                JOIN farms f ON c.farm_id = f.id
                ORDER BY c.last_updated DESC
            ");
            $ledgers = $stmt->fetchAll();
            echo json_encode(["ledgers" => $ledgers]);
            exit;
        } elseif ($action === 'leases') {
            // Retrieve all leases
            $stmt = $pdo->query("
                SELECT l.id, l.farm_id, f.farmer_id, l.terms_json, l.status, l.start_date, l.end_date, f.total_area_acres
                FROM lease_agreements l
                JOIN farms f ON l.farm_id = f.id
                ORDER BY l.start_date DESC
            ");
            $leases = $stmt->fetchAll();
            echo json_encode(["leases" => $leases]);
            exit;
        } else {
            // Default: List all farms with polygons
            $stmt = $pdo->query("
                SELECT f.id, f.farmer_id, u.email, u.contact_number, f.type, ST_AsText(f.boundary_polygon) as boundary_polygon, f.status, f.total_area_acres, f.created_at,
                       l.id as lease_id, l.terms_json as lease_terms, l.status as lease_status, l.start_date as lease_start, l.end_date as lease_end
                FROM farms f 
                JOIN users u ON f.farmer_id = u.farmer_id
                LEFT JOIN lease_agreements l ON f.id = l.farm_id
                ORDER BY f.created_at DESC
            ");
            $farms = $stmt->fetchAll();
            echo json_encode(["farms" => $farms]);
            exit;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database query error: " . $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['id']) || empty($data['status'])) {
        http_response_code(400);
        echo json_encode(["error" => "id and status are required"]);
        exit;
    }
    
    $farm_id = intval($data['id']);
    $status = $data['status'];
    
    if (!in_array($status, ['verified', 'rejected', 'pending'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid status value"]);
        exit;
    }
    
    try {
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("UPDATE farms SET status = :status WHERE id = :id");
        $stmt->execute(['status' => $status, 'id' => $farm_id]);
        
        logAudit($pdo, $adminUser['id'], 'FARM_STATUS_UPDATED', "Updated status of Farm ID $farm_id to '$status'");
        
        // If approved/verified, trigger the Carbon Engine
        if ($status === 'verified') {
            calculateCarbonLedger($pdo, $farm_id);
        }
        
        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Farm status updated to '$status' successfully."]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        echo json_encode(["error" => "Database update failed: " . $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'lease') {
        // Create new lease agreement
        $data = json_decode(file_get_contents("php://input"), true);
        if (empty($data['farm_id']) || empty($data['start_date']) || empty($data['end_date']) || empty($data['terms'])) {
            http_response_code(400);
            echo json_encode(["error" => "farm_id, start_date, end_date, and terms are required"]);
            exit;
        }
        
        try {
            $stmt = $pdo->prepare("
                INSERT INTO lease_agreements (farm_id, terms_json, status, start_date, end_date) 
                VALUES (:farm_id, :terms, 'active', :start_date, :end_date)
            ");
            $stmt->execute([
                'farm_id' => intval($data['farm_id']),
                'terms' => json_encode($data['terms']),
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date']
            ]);
            
            logAudit($pdo, $adminUser['id'], 'LEASE_AGREEMENT_CREATED', "Lease created for Farm ID {$data['farm_id']} from {$data['start_date']} to {$data['end_date']}");
            
            echo json_encode(["success" => true, "message" => "Lease agreement successfully created."]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create lease: " . $e->getMessage()]);
        }
        exit;
    }
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
