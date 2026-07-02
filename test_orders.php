<?php
require_once 'c:/xampp/htdocs/farm/api/db.php';
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
        WHERE o.farmer_id = 7
        ORDER BY o.created_at DESC
    ");
    $stmt->execute();
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
} catch(Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
