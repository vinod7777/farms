<?php
// Enable error reporting for debugging, but handle it cleanly
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

// Key for JWT signing
define('JWT_SECRET', 'sahasrabharatSecretKey2026!EnterpriseAgroForestrySystemSecret');

// Helper to base64UrlEncode
function base64UrlEncode($data) {
    return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
}

// Helper to base64UrlDecode
function base64UrlDecode($data) {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $data .= str_repeat('=', $padlen);
    }
    return base64_decode(str_replace(['-', '_'], ['+', '/'], $data));
}

// Create a JWT
function createJWT($payload) {
    $headers = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $headers_encoded = base64UrlEncode($headers);
    
    $payload_encoded = base64UrlEncode(json_encode($payload));
    
    $signature = hash_hmac('sha256', "$headers_encoded.$payload_encoded", JWT_SECRET, true);
    $signature_encoded = base64UrlEncode($signature);
    
    return "$headers_encoded.$payload_encoded.$signature_encoded";
}

// Verify a JWT
function verifyJWT($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }
    
    list($headers_encoded, $payload_encoded, $signature_encoded) = $parts;
    
    $signature = base64UrlDecode($signature_encoded);
    $raw_signature = hash_hmac('sha256', "$headers_encoded.$payload_encoded", JWT_SECRET, true);
    
    if (!hash_equals($signature, $raw_signature)) {
        return false;
    }
    
    $payload = json_decode(base64UrlDecode($payload_encoded), true);
    if (!$payload || (isset($payload['exp']) && time() >= $payload['exp'])) {
        return false;
    }
    
    return $payload;
}

// Helper to log actions
function logAudit($pdo, $user_id, $action, $details) {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (:user_id, :action, :details, :ip)");
        $stmt->execute([
            'user_id' => $user_id,
            'action' => $action,
            'details' => $details,
            'ip' => $ip
        ]);
    } catch (Exception $e) {
        // Fail silently to prevent crashing API responses
    }
}

// Check and verify token from Authorization header
function getAuthenticatedUser($pdo, $required_role = null) {
    $headers = getallheaders();
    $auth_header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
        $token = $matches[1];
        $payload = verifyJWT($token);
        
        if ($payload && isset($payload['user_id'])) {
            $stmt = $pdo->prepare("SELECT id, farmer_id, email, role, status FROM users WHERE id = :id");
            $stmt->execute(['id' => $payload['user_id']]);
            $user = $stmt->fetch();
            
            if ($user) {
                if ($user['status'] === 'suspended') {
                    logAudit($pdo, $user['id'], 'UNAUTHORIZED_ACCESS_ATTEMPT', 'Suspended user tried to authenticate');
                    http_response_code(403);
                    echo json_encode(["error" => "Account suspended"]);
                    exit;
                }
                
                if ($required_role && $user['role'] !== $required_role) {
                    logAudit($pdo, $user['id'], 'UNAUTHORIZED_ACCESS_ATTEMPT', 'User tried to access ' . $required_role . ' resource');
                    http_response_code(403);
                    echo json_encode(["error" => "Forbidden: Insufficient privileges"]);
                    exit;
                }
                
                return $user;
            }
        }
    }
    
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized: Invalid or missing token"]);
    exit;
}

// Only handle inline login/register logic if this script is accessed directly
if (basename($_SERVER['SCRIPT_FILENAME']) === 'auth.php') {
    $action = $_GET['action'] ?? '';
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if ($action === 'register') {
            if (empty($data['email']) || empty($data['password']) || empty($data['farmer_name']) || empty($data['contact_number'])) {
                http_response_code(400);
                echo json_encode(["error" => "email, password, farmer_name, and contact_number are required"]);
                exit;
            }
            
            // Comprehensive validations
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid email format"]);
                exit;
            }
            if (strlen($data['password']) < 8) {
                http_response_code(400);
                echo json_encode(["error" => "Password must be at least 8 characters long"]);
                exit;
            }
            if (!preg_match('/^\+?[0-9\s\-]{10,15}$/', $data['contact_number'])) {
                http_response_code(400);
                echo json_encode(["error" => "Invalid contact number format"]);
                exit;
            }
            try {
                $role = isset($data['role']) && $data['role'] === 'buyer' ? 'buyer' : 'farmer';
                
                // Generate secure random ID based on role
                $prefix = $role === 'buyer' ? 'BUY-' : 'SB-';
                $farmer_id = $prefix . random_int(100000, 999999);
                $farmer_id_hash = password_hash($farmer_id, PASSWORD_DEFAULT);
                $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
                
                $pdo->beginTransaction();
                
                // Check if email already registered
                $check = $pdo->prepare("SELECT id FROM users WHERE email = :email");
                $check->execute(['email' => $data['email']]);
                if ($check->fetch()) {
                    http_response_code(400);
                    echo json_encode(["error" => "Email is already registered"]);
                    exit;
                }
                
                // Create user
                $stmt = $pdo->prepare("INSERT INTO users (farmer_id, farmer_id_hash, email, name, password_hash, role, status, contact_number) VALUES (:farmer_id, :farmer_id_hash, :email, :name, :password_hash, :role, 'active', :contact_number)");
                $stmt->execute([
                    'farmer_id' => $farmer_id,
                    'farmer_id_hash' => $farmer_id_hash,
                    'email' => $data['email'],
                    'name' => $data['farmer_name'],
                    'password_hash' => $password_hash,
                    'role' => $role,
                    'contact_number' => $data['contact_number']
                ]);
                
                $user_id = $pdo->lastInsertId();
                
                logAudit($pdo, $user_id, 'USER_REGISTERED', "Farmer ID $farmer_id registered by name {$data['farmer_name']}");
                
                $pdo->commit();
                
                echo json_encode([
                    "success" => true,
                    "message" => "Registration successful. Please login using your Farmer ID or Email.",
                    "farmer_id" => $farmer_id
                ]);
            } catch (Exception $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                http_response_code(500);
                echo json_encode(["error" => "Registration failed: " . $e->getMessage()]);
            }
            exit;
            
        } elseif ($action === 'login') {
            if (empty($data['login_id']) || empty($data['password'])) {
                http_response_code(400);
                echo json_encode(["error" => "login_id and password are required"]);
                exit;
            }
            
            $login_id = $data['login_id'];
            $password = $data['password'];
            
            try {
                // Check if login_id matches email or farmer_id
                $stmt = $pdo->prepare("SELECT id, farmer_id, email, password_hash, role, status FROM users WHERE email = :email OR farmer_id = :farmer_id");
                $stmt->execute(['email' => $login_id, 'farmer_id' => $login_id]);
                $user = $stmt->fetch();
                
                if ($user && password_verify($password, $user['password_hash'])) {
                    if ($user['status'] === 'suspended') {
                        logAudit($pdo, $user['id'], 'LOGIN_ATTEMPT_SUSPENDED', 'Attempted login to a suspended account');
                        http_response_code(403);
                        echo json_encode(["error" => "Your account is suspended. Please contact support."]);
                        exit;
                    }
                    
                    // Generate JWT token (expires in 24 hours)
                    $payload = [
                        'user_id' => $user['id'],
                        'email' => $user['email'],
                        'role' => $user['role'],
                        'iat' => time(),
                        'exp' => time() + (24 * 60 * 60)
                    ];
                    $token = createJWT($payload);
                    
                    // Update auth_token
                    $update = $pdo->prepare("UPDATE users SET auth_token = :token WHERE id = :id");
                    $update->execute(['token' => $token, 'id' => $user['id']]);
                    
                    logAudit($pdo, $user['id'], 'USER_LOGIN', 'User logged in successfully');
                    
                    echo json_encode([
                        "success" => true,
                        "token" => $token,
                        "user" => [
                            "id" => $user['id'],
                            "farmer_id" => $user['farmer_id'],
                            "email" => $user['email'],
                            "role" => $user['role']
                        ]
                    ]);
                    exit;
                } else {
                    // Log attempt if user exists
                    $user_id = $user ? $user['id'] : null;
                    logAudit($pdo, $user_id, 'LOGIN_FAILED', "Failed login attempt for ID: $login_id");
                    
                    http_response_code(401);
                    echo json_encode(["error" => "Invalid credentials"]);
                    exit;
                }
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(["error" => "Login failed: " . $e->getMessage()]);
            }
            exit;
        }
    }
    
    http_response_code(400);
    echo json_encode(["error" => "Invalid action"]);
}

