<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Global exception and error handler to ensure JSON output even on fatal errors
set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode(["error" => "Uncaught Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine()]);
    exit;
});

set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) { return; }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
        http_response_code(500);
        echo json_encode(["error" => "Fatal Error: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line']]);
        exit;
    }
});
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
    
    // Verify farm ownership and boundary
    if ($user['role'] === 'admin') {
        $farm_check = $pdo->prepare("SELECT id, status, ST_Contains(ST_Buffer(boundary_polygon, 0.0001), ST_GeomFromText(:coords)) AS is_inside FROM farms WHERE id = :farm_id");
        $farm_check->execute([
            'farm_id' => $farm_id,
            'coords' => $coordinates
        ]);
    } else {
        $farm_check = $pdo->prepare("SELECT id, status, ST_Contains(ST_Buffer(boundary_polygon, 0.0001), ST_GeomFromText(:coords)) AS is_inside FROM farms WHERE id = :farm_id AND farmer_id = :farmer_id");
        $farm_check->execute([
            'farm_id' => $farm_id,
            'farmer_id' => $user['farmer_id'] ?? '',
            'coords' => $coordinates
        ]);
    }
    $farm = $farm_check->fetch();
    
    if (!$farm) {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden: You do not own this farm"]);
        exit;
    }
    
    // Geofencing Check
    if ($farm['is_inside'] != 1 && $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(["error" => "Security Check Failed: You must be physically inside the farm boundaries to register a tree."]);
        exit;
    }
    
    // File validation
    $file = $_FILES['photo'];
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(["error" => "File upload failed with error code: " . $file['error']]);
        exit;
    }

    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!in_array($file['type'], $allowedTypes)) {
        http_response_code(400);
        echo json_encode(["error" => "Only JPEG/JPG/PNG photos are allowed."]);
        exit;
    }
    
    // Create uploads directory safely
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }
    
    $fileExt = pathinfo($file['name'], PATHINFO_EXTENSION);
    $fileName = 'plant_' . uniqid() . '.' . $fileExt;
    $targetPath = $uploadDir . $fileName;
    
    // Suppress warnings on move_uploaded_file to prevent JSON corruption
    if (@move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Run EXIF validation (for JPEG/JPG files)
        $exif_data = null;
        if (in_array(strtolower($fileExt), ['jpg', 'jpeg'])) {
            $exif_data = getGpsFromExif($targetPath);
        }
        
        $gps_match_status = 'no_metadata';
        
        if ($exif_data) {
            // Check coordinate matches (tolerance of ~100m, which is approx 0.001 degrees)
            $lat_diff = abs($exif_data['latitude'] - $sub_lat);
            $lng_diff = abs($exif_data['longitude'] - $sub_lng);
            
            if ($lat_diff <= 0.001 && $lng_diff <= 0.001) {
                $gps_match_status = 'matched';
            } else {
                $gps_match_status = 'mismatched';
            }
        }
        
        // Determine material cost based on species
        $species_lower = strtolower(trim($species));
        $material_cost = 50.00; // default
        if ($species_lower === 'teak') {
            $material_cost = 100.00;
        } elseif ($species_lower === 'mango') {
            $material_cost = 120.00;
        } elseif ($species_lower === 'bamboo') {
            $material_cost = 40.00;
        } elseif ($species_lower === 'cashew') {
            $material_cost = 150.00;
        } elseif ($species_lower === 'agarwood' || $species_lower === 'adharwood') {
            $material_cost = 250.00;
        }
        
        // Estimated delivery: current date + 7 days
        $est_delivery = date('Y-m-d', strtotime('+7 days'));
        
        try {
            $stmt = $pdo->prepare("
                INSERT INTO plants (farm_id, species, coordinates, photo_url, status, gps_match_status, material_cost, estimated_delivery_date, delivery_status) 
                VALUES (:farm_id, :species, ST_GeomFromText(:coordinates, 4326), :photo_url, 'pending', :gps_match_status, :material_cost, :est_delivery, 'pending')
            ");
            $stmt->execute([
                'farm_id' => $farm_id,
                'species' => $species,
                'coordinates' => $coordinates,
                'photo_url' => 'uploads/' . $fileName,
                'gps_match_status' => $gps_match_status,
                'material_cost' => $material_cost,
                'est_delivery' => $est_delivery
            ]);
            
            $plant_id = $pdo->lastInsertId();
            
            logAudit($pdo, $user['id'], 'PLANT_SUBMITTED', "Submitted plant ID $plant_id (Species: $species) on Farm $farm_id (GPS Verification: $gps_match_status)");
            
            echo json_encode([
                "success" => true,
                "message" => "Tree submitted successfully and is pending admin approval.",
                "plant_id" => $plant_id,
                "photo_url" => 'uploads/' . $fileName,
                "gps_match_status" => $gps_match_status
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
    if ($user['role'] === 'admin') {
        $farm_check = $pdo->prepare("SELECT id FROM farms WHERE id = :farm_id");
        $farm_check->execute(['farm_id' => $farm_id]);
    } else {
        $farm_check = $pdo->prepare("SELECT id FROM farms WHERE id = :farm_id AND farmer_id = :farmer_id");
        $farm_check->execute([
            'farm_id' => $farm_id,
            'farmer_id' => $user['farmer_id'] ?? ''
        ]);
    }
    
    if (!$farm_check->fetch()) {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden: You do not have permission to view plants on this farm"]);
        exit;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, farm_id, species, ST_AsText(coordinates) as coordinates, photo_url, status, gps_match_status, material_cost, estimated_delivery_date, delivery_status, planted_at 
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
