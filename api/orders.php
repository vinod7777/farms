<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'db.php';
require_once 'auth.php';

$farmer = getAuthenticatedUser($pdo);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("
            SELECT o.*,
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
            LEFT JOIN products p ON (o.item_type = 'product' OR o.item_type = 'bulk') AND o.item_id = p.id
            LEFT JOIN farms f ON o.item_type = 'rental_farm' AND o.item_id = f.id
            LEFT JOIN plants pl ON o.item_type = 'rental_plant' AND o.item_id = pl.id
            WHERE o.farmer_id = :farmer_id
            ORDER BY o.created_at DESC
        ");
        $stmt->execute(['farmer_id' => $farmer['id']]);
        $orders = $stmt->fetchAll();
        echo json_encode(["success" => true, "orders" => $orders]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to fetch orders: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    try {
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("INSERT INTO orders (farmer_id, order_group_id, item_type, item_id, quantity, address) VALUES (:farmer_id, :order_group_id, :item_type, :item_id, :quantity, :address)");
        
        $address = $data['address'] ?? null;
        
        if (isset($data['items']) && is_array($data['items'])) {
            // Cart checkout
            $order_group_id = 'CART_' . strtoupper(uniqid());
            foreach ($data['items'] as $item) {
                $qty = isset($item['quantity']) ? intval($item['quantity']) : 1;
                $i_type = $item['item_type'];
                $i_id = intval($item['item_id']);
                
                // Validate and update stock for products
                if ($i_type === 'product' || $i_type === 'bulk') {
                    $stockStmt = $pdo->prepare("SELECT stock_quantity FROM products WHERE id = :id FOR UPDATE");
                    $stockStmt->execute(['id' => $i_id]);
                    $product = $stockStmt->fetch();
                    
                    if (!$product || $product['stock_quantity'] < $qty) {
                        throw new Exception("Insufficient stock for product ID {$i_id}. Available: " . ($product ? $product['stock_quantity'] : 0));
                    }
                    
                    $updateStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - :qty WHERE id = :id");
                    $updateStmt->execute(['qty' => $qty, 'id' => $i_id]);
                }
                
                $stmt->execute([
                    'farmer_id' => $farmer['id'],
                    'order_group_id' => $order_group_id,
                    'item_type' => $i_type,
                    'item_id' => $i_id,
                    'quantity' => $qty,
                    'address' => $address
                ]);
            }
        } else {
            // Single item fallback
            if (empty($data['item_type']) || empty($data['item_id'])) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(["error" => "item_type and item_id are required"]);
                exit;
            }
            
            $qty = isset($data['quantity']) ? intval($data['quantity']) : 1;
            $i_type = $data['item_type'];
            $i_id = intval($data['item_id']);
            
            // Validate and update stock for products
            if ($i_type === 'product' || $i_type === 'bulk') {
                $stockStmt = $pdo->prepare("SELECT stock_quantity FROM products WHERE id = :id FOR UPDATE");
                $stockStmt->execute(['id' => $i_id]);
                $product = $stockStmt->fetch();
                
                if (!$product || $product['stock_quantity'] < $qty) {
                    throw new Exception("Insufficient stock for product ID {$i_id}. Available: " . ($product ? $product['stock_quantity'] : 0));
                }
                
                $updateStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - :qty WHERE id = :id");
                $updateStmt->execute(['qty' => $qty, 'id' => $i_id]);
            }

            $stmt->execute([
                'farmer_id' => $farmer['id'],
                'order_group_id' => null,
                'item_type' => $i_type,
                'item_id' => $i_id,
                'quantity' => $qty,
                'address' => $address
            ]);
        }
        
        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Order submitted successfully!"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => "Failed to submit order: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
