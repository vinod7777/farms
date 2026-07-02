<?php
// Auto-detect local vs production environment
if ($_SERVER['SERVER_NAME'] === 'localhost' || $_SERVER['SERVER_NAME'] === '127.0.0.1') {
    // Local XAMPP Credentials
    $host = 'localhost';
    $db   = 'sahasra_barath';
    $user = 'root';
    $pass = '';
} else {
    // Hostinger Production Credentials
    $host = 'localhost';
    $db   = 'u928821418_farm';
    $user = 'u928821418_farm';
    $pass = 'Sahasra@bharat@124';
}
$charset = 'utf8mb4';

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// 1. Connect without db to ensure database itself exists
try {
    $temp_dsn = "mysql:host=$host;charset=$charset";
    $temp_pdo = new PDO($temp_dsn, $user, $pass, $options);
    $temp_pdo->exec("CREATE DATABASE IF NOT EXISTS `$db` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci");
} catch (\PDOException $e) {
    // If connection without db fails, let the next step catch and report it
}

// 2. Connect to the actual database and ensure all tables exist
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Auto-create tables if they do not exist
    $queries = [
        // 1. Users Table
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            farmer_id VARCHAR(50) UNIQUE NULL,
            farmer_id_hash VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('admin', 'farmer') NOT NULL DEFAULT 'farmer',
            status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
            auth_token VARCHAR(500) NULL,
            contact_number VARCHAR(20) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB",

        // 2. Farms Table
        "CREATE TABLE IF NOT EXISTS farms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            farmer_id VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            type ENUM('management_support', 'leased_to_platform') NOT NULL,
            farming_type ENUM('hydroponics', 'organic', 'zbnf', 'agroforest') NOT NULL,
            soil_type VARCHAR(100) NULL,
            water_source VARCHAR(100) NULL,
            irrigation_system ENUM('drip', 'sprinkler', 'none') NULL,
            crop_insurance VARCHAR(10) DEFAULT 'no',
            visit_slot DATE NULL,
            lease_years INT NULL,
            boundary_polygon POLYGON NOT NULL,
            status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
            total_area_acres DECIMAL(10, 4) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_rentable BOOLEAN DEFAULT FALSE,
            document_urls JSON NULL,
            SPATIAL INDEX idx_boundary_polygon (boundary_polygon),
            FOREIGN KEY (farmer_id) REFERENCES users(farmer_id) ON DELETE CASCADE
        ) ENGINE=InnoDB",

        // 3. Plants Table
        "CREATE TABLE IF NOT EXISTS plants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            farm_id INT NOT NULL,
            species VARCHAR(255) NOT NULL,
            coordinates POINT NOT NULL,
            photo_url VARCHAR(255) NOT NULL,
            status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
            gps_match_status ENUM('matched', 'mismatched', 'no_metadata') NOT NULL DEFAULT 'no_metadata',
            material_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            estimated_delivery_date DATE NULL,
            delivery_status ENUM('pending', 'shipped', 'delivered') NOT NULL DEFAULT 'pending',
            planted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            SPATIAL INDEX idx_coordinates (coordinates),
            FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB",

        // 4. Lease Agreements Table
        "CREATE TABLE IF NOT EXISTS lease_agreements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            farm_id INT NOT NULL,
            terms_json JSON NOT NULL,
            status ENUM('active', 'expired') NOT NULL DEFAULT 'active',
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB",

        // 5. Carbon Ledgers Table
        "CREATE TABLE IF NOT EXISTS carbon_ledgers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            farm_id INT NOT NULL UNIQUE,
            calculated_biomass DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
            carbon_credits_generated DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
            market_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB",

        // 6. Audit Logs Table
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            action VARCHAR(255) NOT NULL,
            details TEXT NULL,
            ip_address VARCHAR(45) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB",
        
        // 7. Products Table
        "CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT NULL,
            price DECIMAL(10, 2) NOT NULL,
            locality VARCHAR(255) NULL,
            image_url VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB",

        // 8. Bulk Orders Table
        "CREATE TABLE IF NOT EXISTS bulk_orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            min_quantity INT NOT NULL,
            price_per_unit DECIMAL(10, 2) NOT NULL,
            image_url VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB",

        // 9. Orders Table
        "CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            farmer_id INT NOT NULL,
            item_type ENUM('product', 'rental_farm', 'rental_plant', 'bulk') NOT NULL,
            item_id INT NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            status ENUM('pending', 'approved', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB"
    ];

    foreach ($queries as $query) {
        $pdo->exec($query);
    }

    // Run ALTER TABLE statements to ensure new columns exist in case tables were already created
    $alterQueries = [
        "ALTER TABLE farms ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT ''",
        "ALTER TABLE farms ADD COLUMN farming_type ENUM('hydroponics', 'organic', 'zbnf', 'agroforest') NOT NULL DEFAULT 'agroforest'",
        "ALTER TABLE farms ADD COLUMN soil_type VARCHAR(100) NULL",
        "ALTER TABLE farms ADD COLUMN water_source VARCHAR(100) NULL",
        "ALTER TABLE farms ADD COLUMN irrigation_system ENUM('drip', 'sprinkler', 'none') NULL",
        "ALTER TABLE farms ADD COLUMN crop_insurance VARCHAR(10) DEFAULT 'no'",
        "ALTER TABLE farms ADD COLUMN visit_slot DATE NULL",
        "ALTER TABLE farms MODIFY COLUMN visit_slot DATE NULL",
        "ALTER TABLE farms ADD COLUMN lease_years INT NULL",
        
        "ALTER TABLE plants ADD COLUMN status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'",
        "ALTER TABLE plants ADD COLUMN gps_match_status ENUM('matched', 'mismatched', 'no_metadata') NOT NULL DEFAULT 'no_metadata'",
        "ALTER TABLE plants ADD COLUMN material_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00",
        "ALTER TABLE plants ADD COLUMN estimated_delivery_date DATE NULL",
        "ALTER TABLE plants ADD COLUMN delivery_status ENUM('pending', 'shipped', 'delivered') NOT NULL DEFAULT 'pending'"
    ];
    foreach ($alterQueries as $aq) {
        try {
            $pdo->exec($aq);
        } catch (\PDOException $ex) {
            // Ignore duplicate column errors
            if (strpos($ex->getMessage(), 'Duplicate column name') === false && strpos($ex->getMessage(), 'already exists') === false) {
                // If there's another error, we let it slide (e.g. older MySQL syntax)
            }
        }
    }
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS farm_visits (
            id INT AUTO_INCREMENT PRIMARY KEY,
            farm_id INT NULL,
            visitor_name VARCHAR(255) NOT NULL,
            visitor_phone VARCHAR(50) NOT NULL,
            visitor_email VARCHAR(255) NULL,
            visit_date DATE NOT NULL,
            status ENUM('pending', 'approved', 'completed', 'cancelled') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE SET NULL
        ) ENGINE=InnoDB");

    // Auto-seed admin user if not exists
    $adminEmail = 'admin@sahasrabharat.com';
    $checkAdmin = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $checkAdmin->execute(['email' => $adminEmail]);
    if (!$checkAdmin->fetch()) {
        $adminPasswordHash = '$2y$10$FhtLE8Q7vvll/Mir/wmSQucCqsRMRvUTuMxZ.Tk.a626QPzlDS77y'; // bcrypt hash for AdminPass123!
        $seedAdmin = $pdo->prepare("
            INSERT INTO users (farmer_id, farmer_id_hash, email, password_hash, role, status)
            VALUES (NULL, :farmer_id_hash, :email, :password_hash, 'admin', 'active')
        ");
        $seedAdmin->execute([
            'email' => $adminEmail,
            'farmer_id_hash' => $adminPasswordHash,
            'password_hash' => $adminPasswordHash
        ]);
    }

} catch (\PDOException $e) {
    header('Content-Type: application/json');
    http_response_code(500);
    // Hide the raw error message (which includes db name, user, etc.) for security.
    error_log("Database Error: " . $e->getMessage()); // Log it to the server instead
    echo json_encode(["error" => "Database connection or initialization failed. Please check your credentials or contact the administrator."]);
    exit;
}

