<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once '../db.php';
require_once '../auth.php';

$adminUser = getAuthenticatedUser($pdo, 'admin');

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);

if ($method === 'POST') {
    if (empty($data['crop_name']) || empty($data['min_order_quantity']) || empty($data['price_per_unit'])) {
        http_response_code(400);
        echo json_encode(["error" => "Crop name, min order quantity and price per unit are required"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO bulk_orders (crop_name, description, min_order_quantity, unit, price_per_unit, image_url) VALUES (:crop_name, :description, :min_order_quantity, :unit, :price_per_unit, :image_url)");
        $stmt->execute([
            'crop_name' => $data['crop_name'],
            'description' => $data['description'] ?? null,
            'min_order_quantity' => intval($data['min_order_quantity']),
            'unit' => $data['unit'] ?? 'kg',
            'price_per_unit' => floatval($data['price_per_unit']),
            'image_url' => $data['image_url'] ?? null
        ]);
        
        logAudit($pdo, $adminUser['id'], 'BULK_ORDER_CREATED', "Bulk order created: " . $data['crop_name']);
        
        echo json_encode(["success" => true, "message" => "Bulk order added successfully"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to add bulk order: " . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    if (empty($data['id']) || empty($data['crop_name']) || empty($data['min_order_quantity']) || empty($data['price_per_unit'])) {
        http_response_code(400);
        echo json_encode(["error" => "ID, crop name, min order quantity and price are required"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE bulk_orders SET crop_name = :crop_name, description = :description, min_order_quantity = :min_order_quantity, unit = :unit, price_per_unit = :price_per_unit, image_url = :image_url WHERE id = :id");
        $stmt->execute([
            'crop_name' => $data['crop_name'],
            'description' => $data['description'] ?? null,
            'min_order_quantity' => intval($data['min_order_quantity']),
            'unit' => $data['unit'] ?? 'kg',
            'price_per_unit' => floatval($data['price_per_unit']),
            'image_url' => $data['image_url'] ?? null,
            'id' => intval($data['id'])
        ]);
        
        logAudit($pdo, $adminUser['id'], 'BULK_ORDER_UPDATED', "Bulk order updated: ID " . $data['id']);
        echo json_encode(["success" => true, "message" => "Bulk order updated successfully"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to update bulk order: " . $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Bulk order ID is required"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM bulk_orders WHERE id = :id");
        $stmt->execute(['id' => intval($id)]);
        logAudit($pdo, $adminUser['id'], 'BULK_ORDER_DELETED', "Bulk order deleted: ID $id");
        echo json_encode(["success" => true, "message" => "Bulk order deleted successfully"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to delete bulk order: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
