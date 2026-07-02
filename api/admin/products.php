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
    if (empty($data['name']) || empty($data['price'])) {
        http_response_code(400);
        echo json_encode(["error" => "Name and price are required"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO products (name, description, price, locality, image_url, stock_quantity, unit) VALUES (:name, :description, :price, :locality, :image_url, :stock_quantity, :unit)");
        $stmt->execute([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'price' => floatval($data['price']),
            'locality' => $data['locality'] ?? null,
            'image_url' => $data['image_url'] ?? null,
            'stock_quantity' => isset($data['stock_quantity']) ? intval($data['stock_quantity']) : 0,
            'unit' => $data['unit'] ?? 'kg'
        ]);
        
        logAudit($pdo, $adminUser['id'], 'PRODUCT_CREATED', "Product created: " . $data['name']);
        
        echo json_encode(["success" => true, "message" => "Product added successfully"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to add product: " . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    if (empty($data['id']) || empty($data['name']) || empty($data['price'])) {
        http_response_code(400);
        echo json_encode(["error" => "ID, name and price are required"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE products SET name = :name, description = :description, price = :price, locality = :locality, image_url = :image_url, stock_quantity = :stock_quantity, unit = :unit WHERE id = :id");
        $stmt->execute([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'price' => floatval($data['price']),
            'locality' => $data['locality'] ?? null,
            'image_url' => $data['image_url'] ?? null,
            'stock_quantity' => isset($data['stock_quantity']) ? intval($data['stock_quantity']) : 0,
            'unit' => $data['unit'] ?? 'kg',
            'id' => intval($data['id'])
        ]);
        
        logAudit($pdo, $adminUser['id'], 'PRODUCT_UPDATED', "Product updated: ID " . $data['id']);
        echo json_encode(["success" => true, "message" => "Product updated successfully"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to update product: " . $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Product ID is required"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
        $stmt->execute(['id' => intval($id)]);
        logAudit($pdo, $adminUser['id'], 'PRODUCT_DELETED', "Product deleted: ID $id");
        echo json_encode(["success" => true, "message" => "Product deleted successfully"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to delete product: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
