<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once '../db.php';
require_once '../auth.php';

// Authenticate user - must be Admin
$adminUser = getAuthenticatedUser($pdo, 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$table = $data['table'] ?? '';
$id = $data['id'] ?? null;
$updates = $data['updates'] ?? [];

if (empty($table) || empty($id) || empty($updates)) {
    http_response_code(400);
    echo json_encode(["error" => "Table, ID, and Updates payload are required."]);
    exit;
}

// Security: Whitelist allowed tables
$allowed_tables = ['farms', 'plants', 'carbon_ledgers', 'leases', 'users', 'products', 'bulk_orders', 'orders'];
if (!in_array($table, $allowed_tables)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid or restricted table name."]);
    exit;
}

$db_table = $table === 'leases' ? 'lease_agreements' : $table;

// Get valid columns for the table to avoid SQL errors from joined fields
$stmt = $pdo->prepare("DESCRIBE `$db_table`");
$stmt->execute();
$valid_columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

// Security: Disallow updating protected columns
$protected_columns = ['id', 'password_hash', 'created_at', 'updated_at', 'last_updated'];

$set_clauses = [];
$params = ['id' => $id];

foreach ($updates as $key => $value) {
    if (!in_array($key, $valid_columns)) {
        continue; // Skip columns that do not exist in the base table
    }
    if (in_array($key, $protected_columns)) {
        continue; // Skip protected columns silently
    }
    
    // For spatial columns like polygon/geom, we skip them in this generic editor
    // because they require ST_GeomFromText, and the raw string might just be WKT.
    // However, if we do need to support them, we'd need special logic. For now, skip.
    if ($key === 'boundary_polygon' || $key === 'coordinates' || $key === 'geom') {
        continue; 
    }
    // Dynamic Validation based on column name
    if (stripos($key, 'email') !== false && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid email format for field: $key"]);
        exit;
    }
    if ((stripos($key, 'contact') !== false || stripos($key, 'phone') !== false) && $value !== null && $value !== '') {
        if (!preg_match('/^\+?[0-9\s\-]{10,15}$/', $value)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid contact format for field: $key"]);
            exit;
        }
    }
    if (preg_match('/area|biomass|credits|value|amount|price|stock|quantity|min_order/i', $key)) {
        if (!is_numeric($value) || $value < 0) {
            http_response_code(400);
            echo json_encode(["error" => "Field $key must be a positive number"]);
            exit;
        }
    }
    if (in_array($key, ['status', 'role'])) {
        $allowed = ['active', 'pending', 'verified', 'rejected', 'suspended', 'admin', 'farmer', 'completed', 'approved', 'mismatched', 'no_metadata', 'matched', 'leased_to_platform', 'cancelled', 'shipped'];
        if (!in_array(strtolower($value), $allowed)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid value for $key. Received: $value"]);
            exit;
        }
    }

    $set_clauses[] = "`$key` = :$key";
    $params[$key] = $value;
}

if (empty($set_clauses)) {
    http_response_code(400);
    echo json_encode(["error" => "No valid fields provided for update."]);
    exit;
}

$set_query = implode(", ", $set_clauses);
$sql = "UPDATE `$db_table` SET $set_query WHERE id = :id";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    // Log the master edit
    $edited_keys = implode(", ", array_keys($updates));
    logAudit($pdo, $adminUser['id'], 'MASTER_EDIT', "Admin forcibly updated $table (ID: $id). Fields: $edited_keys");
    
    echo json_encode(["success" => true, "message" => "Entity successfully updated."]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database update failed: " . $e->getMessage()]);
}
