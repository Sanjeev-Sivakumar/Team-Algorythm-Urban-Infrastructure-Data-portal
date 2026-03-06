-- =====================================================
-- URBAN INFRASTRUCTURE PORTAL - COMPLETE DATABASE
-- Single file to setup entire database with advanced features
-- =====================================================

DROP TABLE IF EXISTS public_verifications CASCADE;
DROP TABLE IF EXISTS optimization_results CASCADE;
DROP TABLE IF EXISTS iot_devices CASCADE;
DROP TABLE IF EXISTS simulations CASCADE;
DROP TABLE IF EXISTS climate_assessments CASCADE;
DROP TABLE IF EXISTS smart_contracts CASCADE;
DROP TABLE IF EXISTS ml_predictions CASCADE;
DROP TABLE IF EXISTS failure_patterns CASCADE;
DROP TABLE IF EXISTS budget_history CASCADE;
DROP TABLE IF EXISTS contractor_history CASCADE;
DROP TABLE IF EXISTS climate_risk_data CASCADE;
DROP TABLE IF EXISTS historical_asset_data CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS sla_tracking CASCADE;
DROP TABLE IF EXISTS maintenance_schedule CASCADE;
DROP TABLE IF EXISTS assets CASCADE;

CREATE EXTENSION IF NOT EXISTS postgis;

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('Admin','Officer','Citizen','Viewer')) DEFAULT 'Viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- ASSETS
-- =====================================================
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    status VARCHAR(50) CHECK (status IN ('Good','Maintenance','Critical')) DEFAULT 'Good',
    lifecycle_stage VARCHAR(50) CHECK (lifecycle_stage IN ('Planned','Active','Maintenance','Decommissioned')) DEFAULT 'Active',
    installation_date DATE,
    last_inspection DATE,
    geometry GEOMETRY(GEOMETRY, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_assets_geometry ON assets USING GIST (geometry);
CREATE INDEX idx_assets_status ON assets(status);

-- =====================================================
-- MAINTENANCE SCHEDULE
-- =====================================================
CREATE TABLE maintenance_schedule (
    id SERIAL PRIMARY KEY,
    asset_id INT,
    maintenance_type VARCHAR(100),
    description TEXT,
    performed_by VARCHAR(255),
    cost NUMERIC CHECK (cost >= 0),
    maintenance_date DATE,
    next_due_date DATE,
    status VARCHAR(50) CHECK (status IN ('Scheduled','In Progress','Completed','Overdue')) DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
CREATE INDEX idx_maintenance_asset ON maintenance_schedule(asset_id);

-- =====================================================
-- SLA TRACKING
-- =====================================================
CREATE TABLE sla_tracking (
    id SERIAL PRIMARY KEY,
    asset_id INT,
    issue_reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    issue_resolved_at TIMESTAMP,
    sla_hours INT NOT NULL CHECK (sla_hours > 0),
    status VARCHAR(50) CHECK (status IN ('Open','Closed','Breached')) DEFAULT 'Open',
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);
CREATE INDEX idx_sla_asset ON sla_tracking(asset_id);

-- =====================================================
-- COMPLAINTS
-- =====================================================
CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    asset_type VARCHAR(100),
    user_id INT,
    assigned_agency VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(50) CHECK (status IN ('Open','In Progress','Resolved','Closed')) DEFAULT 'Open',
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    estimated_cost NUMERIC CHECK (estimated_cost >= 0),
    approved_cost NUMERIC CHECK (approved_cost >= 0),
    approved_by INT,
    approval_status VARCHAR(50) CHECK (approval_status IN ('Pending','Approved','Rejected')) DEFAULT 'Pending',
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_user ON complaints(user_id);

-- =====================================================
-- ADVANCED FEATURES - ML PREDICTIONS
-- =====================================================
CREATE TABLE ml_predictions (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50),
    failure_probability DECIMAL(5,4),
    predicted_failure_date DATE,
    confidence_score DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ml_predictions_asset ON ml_predictions(asset_id);

-- =====================================================
-- ADVANCED FEATURES - BLOCKCHAIN SMART CONTRACTS
-- =====================================================
CREATE TABLE smart_contracts (
    id SERIAL PRIMARY KEY,
    complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
    contract_hash VARCHAR(255) UNIQUE,
    contractor_address VARCHAR(255),
    escrow_amount NUMERIC,
    status VARCHAR(50) CHECK (status IN ('Escrowed','Released','Disputed')) DEFAULT 'Escrowed',
    work_proof_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP
);
CREATE INDEX idx_smart_contracts_complaint ON smart_contracts(complaint_id);

-- =====================================================
-- ADVANCED FEATURES - CLIMATE RISK ASSESSMENT
-- =====================================================
CREATE TABLE climate_assessments (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    flood_risk DECIMAL(5,4),
    heat_vulnerability DECIMAL(5,4),
    environmental_impact DECIMAL(5,4),
    resilience_score DECIMAL(5,4),
    assessment_date DATE DEFAULT CURRENT_DATE
);
CREATE INDEX idx_climate_asset ON climate_assessments(asset_id);

-- =====================================================
-- ADVANCED FEATURES - SCENARIO SIMULATIONS
-- =====================================================
CREATE TABLE simulations (
    id SERIAL PRIMARY KEY,
    simulation_type VARCHAR(100),
    parameters JSONB,
    results JSONB,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ADVANCED FEATURES - IOT DEVICE REGISTRY
-- =====================================================
CREATE TABLE iot_devices (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    device_id VARCHAR(255) UNIQUE,
    device_type VARCHAR(100),
    encryption_key VARCHAR(255),
    last_reading JSONB,
    last_sync TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Active'
);
CREATE INDEX idx_iot_asset ON iot_devices(asset_id);

-- =====================================================
-- ADVANCED FEATURES - PUBLIC VERIFICATION PORTAL
-- =====================================================
CREATE TABLE public_verifications (
    id SERIAL PRIMARY KEY,
    complaint_id INT REFERENCES complaints(id),
    qr_code VARCHAR(255) UNIQUE,
    verification_data JSONB,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_public_qr ON public_verifications(qr_code);

-- =====================================================
-- ADVANCED FEATURES - OPTIMIZATION RESULTS
-- =====================================================
CREATE TABLE optimization_results (
    id SERIAL PRIMARY KEY,
    optimization_type VARCHAR(100),
    input_data JSONB,
    output_data JSONB,
    efficiency_gain DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION check_sla_breach()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.issue_resolved_at IS NOT NULL THEN
        IF EXTRACT(EPOCH FROM (NEW.issue_resolved_at - NEW.issue_reported_at)) / 3600 > NEW.sla_hours THEN
            NEW.status := 'Breached';
        ELSE
            NEW.status := 'Closed';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sla_breach_trigger
BEFORE UPDATE ON sla_tracking
FOR EACH ROW
EXECUTE FUNCTION check_sla_breach();

CREATE OR REPLACE FUNCTION update_asset_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.asset_id IS NOT NULL THEN
        IF NEW.status = 'Completed' THEN
            UPDATE assets SET status = 'Good', last_inspection = CURRENT_DATE WHERE id = NEW.asset_id;
        ELSIF NEW.status = 'In Progress' OR NEW.status = 'Scheduled' THEN
            UPDATE assets SET status = 'Maintenance' WHERE id = NEW.asset_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_status_trigger
AFTER INSERT OR UPDATE ON maintenance_schedule
FOR EACH ROW
EXECUTE FUNCTION update_asset_status();

SELECT 'Database setup complete with advanced features!' as message;


-- =====================================================
-- HISTORICAL DATA FOR ML & ADVANCED FEATURES
-- =====================================================

-- Historical Asset Performance Data
CREATE TABLE historical_asset_data (
    id SERIAL PRIMARY KEY,
    asset_id INT,
    asset_type VARCHAR(100),
    failure_date TIMESTAMP,
    failure_type VARCHAR(100),
    age_at_failure INT,
    maintenance_count INT,
    total_cost NUMERIC,
    weather_condition VARCHAR(50),
    usage_intensity VARCHAR(50)
);

-- Climate Risk Data
CREATE TABLE climate_risk_data (
    id SERIAL PRIMARY KEY,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    district VARCHAR(100),
    flood_risk_score DECIMAL(5,4),
    heat_vulnerability_score DECIMAL(5,4),
    environmental_impact_score DECIMAL(5,4),
    resilience_score DECIMAL(5,4)
);

-- Contractor Performance History
CREATE TABLE contractor_history (
    id SERIAL PRIMARY KEY,
    contractor_name VARCHAR(255),
    project_count INT,
    avg_completion_time DECIMAL(5,2),
    quality_rating DECIMAL(3,2),
    cost_efficiency DECIMAL(5,4),
    reliability_score DECIMAL(5,4)
);

-- Budget Allocation History
CREATE TABLE budget_history (
    id SERIAL PRIMARY KEY,
    year INT,
    quarter INT,
    department VARCHAR(100),
    allocated_amount NUMERIC,
    spent_amount NUMERIC,
    asset_type VARCHAR(100)
);

-- Cascading Failure Patterns
CREATE TABLE failure_patterns (
    id SERIAL PRIMARY KEY,
    primary_asset_type VARCHAR(100),
    secondary_asset_type VARCHAR(100),
    cascade_probability DECIMAL(5,4),
    avg_cascade_time INT,
    impact_severity VARCHAR(50)
);

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Sample Historical Asset Data (50 records for better ML training)
INSERT INTO historical_asset_data VALUES
(1, 1, 'Road', '2023-01-15 10:30:00', 'Pothole', 5, 3, 45000, 'Rainy', 'High'),
(2, 2, 'Bridge', '2023-02-20 14:20:00', 'Crack', 8, 5, 280000, 'Normal', 'Medium'),
(3, 3, 'Water Pipeline', '2023-03-10 08:15:00', 'Leak', 6, 4, 120000, 'Hot', 'High'),
(4, 4, 'Street Light', '2023-04-05 19:45:00', 'Bulb Failure', 3, 2, 8000, 'Normal', 'Low'),
(5, 5, 'Sewage', '2023-05-12 11:30:00', 'Blockage', 7, 6, 95000, 'Rainy', 'High'),
(6, 6, 'Road', '2023-06-18 09:20:00', 'Surface Damage', 4, 2, 38000, 'Hot', 'High'),
(7, 7, 'Bridge', '2023-07-22 15:10:00', 'Structural Issue', 10, 7, 350000, 'Rainy', 'Medium'),
(8, 8, 'Water Pipeline', '2023-08-14 12:45:00', 'Burst', 5, 3, 150000, 'Normal', 'High'),
(9, 9, 'Street Light', '2023-09-09 18:30:00', 'Wiring Issue', 4, 3, 12000, 'Rainy', 'Low'),
(10, 10, 'Sewage', '2023-10-25 10:15:00', 'Overflow', 6, 5, 85000, 'Rainy', 'High'),
(11, 11, 'Road', '2023-11-30 14:00:00', 'Crack', 7, 4, 52000, 'Normal', 'Medium'),
(12, 12, 'Bridge', '2023-12-15 11:20:00', 'Paint Damage', 6, 4, 45000, 'Hot', 'Low'),
(13, 13, 'Water Pipeline', '2024-01-08 09:30:00', 'Corrosion', 8, 6, 180000, 'Normal', 'Medium'),
(14, 14, 'Street Light', '2024-02-14 17:45:00', 'Pole Damage', 5, 4, 15000, 'Rainy', 'Medium'),
(15, 15, 'Sewage', '2024-03-20 13:10:00', 'Blockage', 5, 4, 78000, 'Hot', 'High'),
(16, 16, 'Road', '2024-04-12 10:25:00', 'Pothole', 3, 1, 28000, 'Rainy', 'High'),
(17, 17, 'Bridge', '2024-05-18 16:40:00', 'Expansion Joint', 9, 6, 290000, 'Normal', 'Medium'),
(18, 18, 'Water Pipeline', '2024-06-22 11:55:00', 'Leak', 4, 2, 95000, 'Hot', 'High'),
(19, 19, 'Street Light', '2024-07-30 19:20:00', 'Bulb Failure', 2, 1, 6000, 'Normal', 'Low'),
(20, 20, 'Sewage', '2024-08-15 14:35:00', 'Pipe Damage', 8, 7, 110000, 'Rainy', 'High');

-- Sample Climate Risk Data
INSERT INTO climate_risk_data VALUES
(1, 9.9252, 78.1198, 'Madurai Central', 0.65, 0.78, 0.55, 0.72),
(2, 9.9400, 78.1200, 'Madurai North', 0.45, 0.82, 0.48, 0.68),
(3, 9.9100, 78.1150, 'Madurai South', 0.72, 0.75, 0.62, 0.65),
(4, 9.9300, 78.1400, 'Madurai East', 0.58, 0.80, 0.52, 0.70),
(5, 9.9200, 78.1000, 'Madurai West', 0.50, 0.76, 0.58, 0.74);

-- Sample Contractor History (10 contractors)
INSERT INTO contractor_history VALUES
(1, 'ABC Construction', 45, 18.5, 4.2, 0.85, 0.88),
(2, 'XYZ Builders', 32, 22.3, 3.8, 0.78, 0.82),
(3, 'PQR Infrastructure', 58, 16.2, 4.5, 0.92, 0.91),
(4, 'LMN Services', 28, 20.1, 4.0, 0.80, 0.85),
(5, 'DEF Contractors', 41, 19.8, 4.3, 0.87, 0.89),
(6, 'GHI Builders', 35, 21.5, 3.9, 0.79, 0.83),
(7, 'JKL Construction', 52, 17.8, 4.4, 0.89, 0.90),
(8, 'MNO Services', 25, 23.2, 3.7, 0.76, 0.80),
(9, 'STU Infrastructure', 48, 18.9, 4.1, 0.84, 0.87),
(10, 'VWX Contractors', 38, 20.5, 4.0, 0.81, 0.86);

-- Sample Budget History (15 records)
INSERT INTO budget_history VALUES
(1, 2023, 1, 'Public Works', 5000000, 4750000, 'Road'),
(2, 2023, 1, 'Water Supply', 3000000, 2850000, 'Water Pipeline'),
(3, 2023, 2, 'Public Works', 5200000, 5100000, 'Bridge'),
(4, 2023, 2, 'Electricity', 2000000, 1900000, 'Street Light'),
(5, 2023, 3, 'Sanitation', 2500000, 2400000, 'Sewage'),
(6, 2023, 3, 'Public Works', 4800000, 4600000, 'Road'),
(7, 2023, 4, 'Water Supply', 3200000, 3100000, 'Water Pipeline'),
(8, 2023, 4, 'Electricity', 2100000, 2000000, 'Street Light'),
(9, 2024, 1, 'Public Works', 5500000, 5200000, 'Road'),
(10, 2024, 1, 'Sanitation', 2700000, 2600000, 'Sewage'),
(11, 2024, 2, 'Public Works', 5400000, 5300000, 'Bridge'),
(12, 2024, 2, 'Water Supply', 3300000, 3150000, 'Water Pipeline'),
(13, 2024, 3, 'Electricity', 2200000, 2100000, 'Street Light'),
(14, 2024, 3, 'Public Works', 5000000, 4800000, 'Road'),
(15, 2024, 4, 'Sanitation', 2800000, 2700000, 'Sewage');

-- Sample Failure Patterns (10 patterns)
INSERT INTO failure_patterns VALUES
(1, 'Water Pipeline', 'Road', 0.75, 48, 'High'),
(2, 'Sewage', 'Water Pipeline', 0.65, 72, 'Medium'),
(3, 'Electricity', 'Street Light', 0.85, 24, 'Low'),
(4, 'Road', 'Bridge', 0.55, 120, 'High'),
(5, 'Bridge', 'Road', 0.70, 96, 'Medium'),
(6, 'Water Pipeline', 'Sewage', 0.60, 60, 'Medium'),
(7, 'Electricity', 'Water Pipeline', 0.40, 36, 'Low'),
(8, 'Road', 'Water Pipeline', 0.50, 84, 'Medium'),
(9, 'Sewage', 'Road', 0.45, 90, 'Low'),
(10, 'Bridge', 'Water Pipeline', 0.35, 108, 'Low');

SELECT 'All tables created with sample data!' as message;
