<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['farm_name']) || !isset($data['farmer_name']) || !isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(["error" => "farmer_name, email, password, and farm_name are required"]);
        exit;
    }

    $farmer_name = $data['farmer_name'];
    $email = $data['email'];
    $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
    $farm_name = $data['farm_name'];
    $address = isset($data['address']) ? $data['address'] : null;
    $latitude = isset($data['latitude']) && $data['latitude'] !== '' ? $data['latitude'] : null;
    $longitude = isset($data['longitude']) && $data['longitude'] !== '' ? $data['longitude'] : null;
    
    $boundary_polygon = isset($data['boundary_polygon']) && trim($data['boundary_polygon']) !== '' ? $data['boundary_polygon'] : null;

    $farmer_id = 'SB-' . random_int(1000, 9999);

    try {
        if ($boundary_polygon) {
            $stmt = $pdo->prepare("INSERT INTO farms (farmer_id, farmer_name, email, password_hash, farm_name, address, latitude, longitude, boundary_polygon, status) VALUES (:farmer_id, :farmer_name, :email, :password_hash, :farm_name, :address, :latitude, :longitude, ST_GeomFromText(:boundary_polygon), 'pending')");
            $stmt->execute([
                'farmer_id' => $farmer_id,
                'farmer_name' => $farmer_name,
                'email' => $email,
                'password_hash' => $password_hash,
                'farm_name' => $farm_name,
                'address' => $address,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'boundary_polygon' => $boundary_polygon
            ]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO farms (farmer_id, farmer_name, email, password_hash, farm_name, address, latitude, longitude, status) VALUES (:farmer_id, :farmer_name, :email, :password_hash, :farm_name, :address, :latitude, :longitude, 'pending')");
            $stmt->execute([
                'farmer_id' => $farmer_id,
                'farmer_name' => $farmer_name,
                'email' => $email,
                'password_hash' => $password_hash,
                'farm_name' => $farm_name,
                'address' => $address,
                'latitude' => $latitude,
                'longitude' => $longitude
            ]);
        }

        $farm_id = $pdo->lastInsertId();

        echo json_encode([
            "success" => true,
            "farmer_id" => $farmer_id,
            "farm_id" => $farm_id,
            "message" => "Registration successful. Please keep your Farmer ID for login."
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
