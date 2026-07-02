<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once '../db.php';
require_once '../auth.php';

$adminUser = getAuthenticatedUser($pdo, 'admin');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("
            SELECT o.*, u.email as farmer_email, u.farmer_id as farmer_ref, 
                   SUBSTRING_INDEX(SUBSTRING_INDEX(o.address, '\n', 1), ': ', -1) as farmer_name,
                   CASE 
                     WHEN o.item_type = 'product' THEN p.name
                     WHEN o.item_type = 'bulk' THEN p.name
                     WHEN o.item_type = 'rental_farm' THEN f.name
                     WHEN o.item_type = 'rental_plant' THEN pl.species
                     ELSE 'Unknown'
                   END as item_name,
                   CASE 
                     WHEN o.item_type = 'product' THEN p.image_url
                     WHEN o.item_type = 'bulk' THEN p.image_url
                     WHEN o.item_type = 'rental_farm' THEN NULL
                     WHEN o.item_type = 'rental_plant' THEN pl.photo_url
                     ELSE NULL
                   END as image_url,
                   CASE 
                     WHEN o.item_type = 'product' THEN p.price
                     WHEN o.item_type = 'bulk' THEN p.price
                     WHEN o.item_type = 'rental_farm' THEN 0
                     WHEN o.item_type = 'rental_plant' THEN pl.material_cost
                     ELSE 0
                   END as product_price
            FROM orders o 
            JOIN users u ON o.farmer_id = u.id 
            LEFT JOIN products p ON (o.item_type = 'product' OR o.item_type = 'bulk') AND o.item_id = p.id
            LEFT JOIN farms f ON o.item_type = 'rental_farm' AND o.item_id = f.id
            LEFT JOIN plants pl ON o.item_type = 'rental_plant' AND o.item_id = pl.id
            ORDER BY o.created_at DESC
        ");
        $orders = $stmt->fetchAll();
        echo json_encode(["success" => true, "orders" => $orders]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch orders: " . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    if ((empty($data['id']) && empty($data['order_group_id'])) || empty($data['status'])) {
        http_response_code(400);
        echo json_encode(["error" => "ID (or order_group_id) and status are required"]);
        exit;
    }
    
    try {
        if (!empty($data['order_group_id'])) {
            $stmt = $pdo->prepare("UPDATE orders SET status = :status WHERE order_group_id = :order_group_id");
            $stmt->execute([
                'status' => $data['status'],
                'order_group_id' => $data['order_group_id']
            ]);
            logAudit($pdo, $adminUser['id'], 'ORDER_STATUS_UPDATED', "Group Order {$data['order_group_id']} status updated to {$data['status']}");
        } else {
            $stmt = $pdo->prepare("UPDATE orders SET status = :status WHERE id = :id");
            $stmt->execute([
                'status' => $data['status'],
                'id' => intval($data['id'])
            ]);
            logAudit($pdo, $adminUser['id'], 'ORDER_STATUS_UPDATED', "Order ID {$data['id']} status updated to {$data['status']}");
        }
        
        echo json_encode(["success" => true, "message" => "Order updated successfully"]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to update order: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
