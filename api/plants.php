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

// Authenticate user - must be logged in
$user = getAuthenticatedUser($pdo);

// Helper to convert EXIF coordinate ratio array to decimal degree
function getGpsCoordinate($coordinate, $ref) {
    if (!is_array($coordinate)) {
        return 0;
    }
    $parts = [];
    foreach ($coordinate as $part) {
        $subParts = explode('/', $part);
        if (count($subParts) == 2) {
            $parts[] = $subParts[1] > 0 ? (float)$subParts[0] / (float)$subParts[1] : 0;
        } else {
            $parts[] = (float)$part;
        }
    }
    
    $degrees = $parts[0] ?? 0;
    $minutes = $parts[1] ?? 0;
    $seconds = $parts[2] ?? 0;
    
    $value = $degrees + ($minutes / 60) + ($seconds / 3600);
    if ($ref === 'S' || $ref === 'W') {
        $value = -$value;
    }
    return $value;
}

// Helper to extract GPS from EXIF
function getGpsFromExif($filePath) {
    // Check if the exif extension is loaded and readable
    if (!function_exists('exif_read_data')) {
        return null;
    }
    
    // Read EXIF (suppress errors in case of malformed EXIF)
    $exif = @exif_read_data($filePath);
    if (!$exif) {
        return null;
    }
    
    if (!isset($exif['GPSLatitude'], $exif['GPSLongitude'], $exif['GPSLatitudeRef'], $exif['GPSLongitudeRef'])) {
        return null;
    }
    
    $lat = getGpsCoordinate($exif['GPSLatitude'], $exif['GPSLatitudeRef']);
    $lng = getGpsCoordinate($exif['GPSLongitude'], $exif['GPSLongitudeRef']);
    
    return [
        'latitude' => $lat,
        'longitude' => $lng,
        'timestamp' => $exif['DateTimeOriginal'] ?? $exif['DateTime'] ?? null
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Expect multipart/form-data for image uploads
    if (!isset($_POST['farm_id']) || !isset($_POST['species']) || !isset($_POST['coordinates']) || !isset($_FILES['photo'])) {
        http_response_code(400);
        echo json_encode(["error" => "farm_id, species, coordinates (POINT(lng lat)), and photo file are required"]);
        exit;
    }
    
    $farm_id = intval($_POST['farm_id']);
    $species = $_POST['species'];
    $coordinates = $_POST['coordinates']; // Format: 'POINT(lng lat)'
    
    // Parse coordinates submitted
    if (!preg_match('/POINT\(([-\d\.]+)\s+([-\d\.]+)\)/i', $coordinates, $coord_matches)) {
        http_response_code(400);
        echo json_encode(["error" => "Coordinates must be in format: POINT(lng lat)"]);
        exit;
    }
    $sub_lng = floatval($coord_matches[1]);
    $sub_lat = floatval($coord_matches[2]);
    
    // Verify farm ownership
    $farm_check = $pdo->prepare("SELECT id, status FROM farms WHERE id = :farm_id AND (farmer_id = :farmer_id OR :role = 'admin')");
    $farm_check->execute([
        'farm_id' => $farm_id,
        'farmer_id' => $user['farmer_id'] ?? '',
        'role' => $user['role']
    ]);
    $farm = $farm_check->fetch();
    
    if (!$farm) {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden: You do not own this farm"]);
        exit;
    }
    
    // File validation
    $file = $_FILES['photo'];
    $allowedTypes = ['image/jpeg', 'image/jpg'];
    if (!in_array($file['type'], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(["error" => "Only JPEG/JPG photos are allowed to support EXIF metadata checks."]);
        exit;
    }
    
    // Create uploads directory if it doesn't exist
    $uploadDir = '../uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $fileExt = pathinfo($file['name'], PATHINFO_EXTENSION);
    $fileName = 'plant_' . uniqid() . '.' . $fileExt;
    $targetPath = $uploadDir . $fileName;
    
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Run EXIF validation
        $exif_data = getGpsFromExif($targetPath);
        
        if (!$exif_data) {
            // Remove file and reject
            unlink($targetPath);
            logAudit($pdo, $user['id'], 'EXIF_CHECK_FAILED', "Uploaded photo for Farm $farm_id lacked GPS metadata");
            http_response_code(400);
            echo json_encode(["error" => "Photo verification failed: Image lacks embedded GPS EXIF metadata. Please capture using your device camera with location services enabled."]);
            exit;
        }
        
        // Check coordinate matches (tolerance of ~100m, which is approx 0.001 degrees)
        $lat_diff = abs($exif_data['latitude'] - $sub_lat);
        $lng_diff = abs($exif_data['longitude'] - $sub_lng);
        
        if ($lat_diff > 0.001 || $lng_diff > 0.001) {
            unlink($targetPath);
            logAudit($pdo, $user['id'], 'EXIF_GPS_MISMATCH', "Farm $farm_id plant coordinates (lat: $sub_lat, lng: $sub_lng) mismatched EXIF coordinates (lat: {$exif_data['latitude']}, lng: {$exif_data['longitude']})");
            http_response_code(400);
            echo json_encode([
                "error" => "Photo verification failed: The GPS coordinates embedded in the photo do not match the location where you mapped this plant.",
                "details" => [
                    "submitted" => ["lat" => $sub_lat, "lng" => $sub_lng],
                    "photo" => ["lat" => $exif_data['latitude'], "lng" => $exif_data['longitude']]
                ]
            ]);
            exit;
        }
        
        try {
            $stmt = $pdo->prepare("
                INSERT INTO plants (farm_id, species, coordinates, photo_url) 
                VALUES (:farm_id, :species, ST_GeomFromText(:coordinates, 4326), :photo_url)
            ");
            $stmt->execute([
                'farm_id' => $farm_id,
                'species' => $species,
                'coordinates' => $coordinates,
                'photo_url' => 'uploads/' . $fileName
            ]);
            
            $plant_id = $pdo->lastInsertId();
            
            logAudit($pdo, $user['id'], 'PLANT_REGISTERED', "Registered plant ID $plant_id (Species: $species) on Farm $farm_id");
            
            echo json_encode([
                "success" => true,
                "message" => "Tree verified and registered successfully.",
                "plant_id" => $plant_id,
                "photo_url" => 'uploads/' . $fileName
            ]);
        } catch (PDOException $e) {
            unlink($targetPath);
            http_response_code(500);
            echo json_encode(["error" => "Database error: " . $e->getMessage()]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to save uploaded photo."]);
    }
    exit;
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_GET['farm_id'])) {
        http_response_code(400);
        echo json_encode(["error" => "farm_id is required"]);
        exit;
    }
    
    $farm_id = intval($_GET['farm_id']);
    
    // Check access permissions
    $farm_check = $pdo->prepare("SELECT id FROM farms WHERE id = :farm_id AND (farmer_id = :farmer_id OR :role = 'admin')");
    $farm_check->execute([
        'farm_id' => $farm_id,
        'farmer_id' => $user['farmer_id'] ?? '',
        'role' => $user['role']
    ]);
    
    if (!$farm_check->fetch()) {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden: You do not have permission to view plants on this farm"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, farm_id, species, ST_AsText(coordinates) as coordinates, photo_url, planted_at 
            FROM plants 
            WHERE farm_id = :farm_id
        ");
        $stmt->execute(['farm_id' => $farm_id]);
        $plants = $stmt->fetchAll();
        
        echo json_encode(["plants" => $plants]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Database query error: " . $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
