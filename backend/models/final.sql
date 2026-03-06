-- URBAN INFRASTRUCTURE MANAGEMENT - COMPLETE DATABASE

DROP TABLE IF EXISTS budget_history CASCADE;
DROP TABLE IF EXISTS public_verifications CASCADE;
DROP TABLE IF EXISTS optimization_results CASCADE;
DROP TABLE IF EXISTS iot_devices CASCADE;
DROP TABLE IF EXISTS simulations CASCADE;
DROP TABLE IF EXISTS climate_assessments CASCADE;
DROP TABLE IF EXISTS smart_contracts CASCADE;
DROP TABLE IF EXISTS ml_predictions CASCADE;
DROP TABLE IF EXISTS cascading_failures CASCADE;
DROP TABLE IF EXISTS contractor_performance CASCADE;
DROP TABLE IF EXISTS climate_risk_data CASCADE;
DROP TABLE IF EXISTS budget_optimization_data CASCADE;
DROP TABLE IF EXISTS asset_failure_training CASCADE;
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS sla_tracking CASCADE;
DROP TABLE IF EXISTS maintenance_schedule CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE EXTENSION IF NOT EXISTS postgis;

-- USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('Admin','Officer','Citizen','Viewer')) DEFAULT 'Viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_email ON users(email);

-- ASSETS
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    district VARCHAR(100) DEFAULT 'Central',
    status VARCHAR(50) CHECK (status IN ('Good','Maintenance','Critical')) DEFAULT 'Good',
    lifecycle_stage VARCHAR(50) DEFAULT 'Active',
    installation_date DATE,
    last_inspection DATE,
    geometry GEOMETRY(GEOMETRY, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_assets_geometry ON assets USING GIST (geometry);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_district ON assets(district);

-- MAINTENANCE SCHEDULE
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

-- SLA TRACKING
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

-- COMPLAINTS
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

-- BUDGET HISTORY
CREATE TABLE budget_history (
    id SERIAL PRIMARY KEY,
    district VARCHAR(100),
    department VARCHAR(100),
    allocated_amount NUMERIC DEFAULT 0,
    spent_amount NUMERIC DEFAULT 0,
    asset_type VARCHAR(100),
    fiscal_year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_budget_district ON budget_history(district);
CREATE INDEX idx_budget_department ON budget_history(department);

-- ML DATASET: ASSET FAILURE TRAINING
CREATE TABLE asset_failure_training (
    id SERIAL PRIMARY KEY,
    asset_id INT,
    asset_type VARCHAR(100) NOT NULL,
    failure_date TIMESTAMP,
    failure_type VARCHAR(100),
    age_at_failure INT,
    maintenance_count INT,
    total_cost NUMERIC,
    weather_condition VARCHAR(50),
    usage_intensity VARCHAR(50),
    failure_occurred BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_failure_asset_type ON asset_failure_training(asset_type);

-- ML DATASET: BUDGET OPTIMIZATION
CREATE TABLE budget_optimization_data (
    id SERIAL PRIMARY KEY,
    budget_id INT,
    year INT,
    quarter INT,
    department VARCHAR(100),
    allocated_amount NUMERIC,
    spent_amount NUMERIC,
    asset_type VARCHAR(100),
    project_count INT,
    efficiency_score DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_budget_year ON budget_optimization_data(year);

-- ML DATASET: CLIMATE RISK
CREATE TABLE climate_risk_data (
    id SERIAL PRIMARY KEY,
    location_id INT,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    district VARCHAR(100),
    flood_risk_score DECIMAL(5,4),
    heat_vulnerability_score DECIMAL(5,4),
    environmental_impact_score DECIMAL(5,4),
    resilience_score DECIMAL(5,4),
    elevation INT,
    drainage_quality DECIMAL(5,3),
    vegetation_cover DECIMAL(5,3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_climate_district ON climate_risk_data(district);

-- ML DATASET: CONTRACTOR PERFORMANCE
CREATE TABLE contractor_performance (
    id SERIAL PRIMARY KEY,
    contractor_id INT,
    contractor_name VARCHAR(255) NOT NULL,
    project_count INT,
    avg_completion_time DECIMAL(5,2),
    quality_rating DECIMAL(3,2),
    cost_efficiency DECIMAL(5,4),
    reliability_score DECIMAL(5,4),
    on_time_delivery DECIMAL(5,4),
    customer_satisfaction DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_contractor_name ON contractor_performance(contractor_name);

-- ML DATASET: CASCADING FAILURES
CREATE TABLE cascading_failures (
    id SERIAL PRIMARY KEY,
    pattern_id INT,
    primary_asset_type VARCHAR(100),
    secondary_asset_type VARCHAR(100),
    cascade_probability DECIMAL(5,4),
    avg_cascade_time_hours INT,
    impact_severity VARCHAR(50),
    historical_occurrences INT,
    mitigation_cost NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_cascade_primary ON cascading_failures(primary_asset_type);

-- ML PREDICTIONS
CREATE TABLE ml_predictions (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50),
    failure_probability DECIMAL(5,4),
    predicted_failure_date DATE,
    confidence_score DECIMAL(5,4),
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ml_predictions_asset ON ml_predictions(asset_id);

-- SMART CONTRACTS
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

-- CLIMATE ASSESSMENTS
CREATE TABLE climate_assessments (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    flood_risk DECIMAL(5,4),
    heat_vulnerability DECIMAL(5,4),
    environmental_impact DECIMAL(5,4),
    resilience_score DECIMAL(5,4),
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recommendations TEXT
);
CREATE INDEX idx_climate_asset ON climate_assessments(asset_id);

-- SIMULATIONS
CREATE TABLE simulations (
    id SERIAL PRIMARY KEY,
    simulation_type VARCHAR(100),
    parameters JSONB,
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- IOT DEVICES
CREATE TABLE iot_devices (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id) ON DELETE CASCADE,
    device_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    last_reading JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_iot_asset ON iot_devices(asset_id);

-- OPTIMIZATION RESULTS
CREATE TABLE optimization_results (
    id SERIAL PRIMARY KEY,
    optimization_type VARCHAR(100),
    input_parameters JSONB,
    output_results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PUBLIC VERIFICATIONS
CREATE TABLE public_verifications (
    id SERIAL PRIMARY KEY,
    contract_id INT REFERENCES smart_contracts(id) ON DELETE CASCADE,
    verification_code VARCHAR(255) UNIQUE,
    verified_at TIMESTAMP,
    verified_by VARCHAR(255)
);
CREATE INDEX idx_public_verifications_contract ON public_verifications(contract_id);

-- TRIGGERS
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

-- SAMPLE DATA

-- Sample Assets (10 records with districts)
INSERT INTO assets (name, type, department, district, status, installation_date, geometry) VALUES
('Main Road Bridge', 'Bridge', 'Public Works', 'Madurai Central', 'Good', '2020-01-15', ST_SetSRID(ST_MakePoint(78.1198, 9.9252), 4326)),
('Central Water Pipeline', 'Water Pipeline', 'Water Supply', 'Madurai Central', 'Good', '2019-06-20', ST_SetSRID(ST_MakePoint(78.1200, 9.9400), 4326)),
('Street Light Pole 101', 'Street Light', 'Electricity', 'Madurai South', 'Good', '2021-03-10', ST_SetSRID(ST_MakePoint(78.1150, 9.9100), 4326)),
('North District Road', 'Road', 'Public Works', 'Madurai North', 'Maintenance', '2018-05-12', ST_SetSRID(ST_MakePoint(78.1180, 9.9450), 4326)),
('Sewage Treatment Plant', 'Sewage', 'Sanitation', 'Madurai South', 'Good', '2017-08-22', ST_SetSRID(ST_MakePoint(78.1120, 9.9050), 4326)),
('East Zone Bridge', 'Bridge', 'Public Works', 'Madurai East', 'Critical', '2015-11-30', ST_SetSRID(ST_MakePoint(78.1420, 9.9280), 4326)),
('West Water Tank', 'Water Pipeline', 'Water Supply', 'Madurai West', 'Good', '2020-02-14', ST_SetSRID(ST_MakePoint(78.0980, 9.9180), 4326)),
('South Street Lights', 'Street Light', 'Electricity', 'Madurai South', 'Maintenance', '2019-07-18', ST_SetSRID(ST_MakePoint(78.1150, 9.9100), 4326)),
('Central Park Road', 'Road', 'Public Works', 'Madurai Central', 'Good', '2021-09-25', ST_SetSRID(ST_MakePoint(78.1250, 9.9350), 4326)),
('Industrial Sewage Line', 'Sewage', 'Sanitation', 'Madurai West', 'Good', '2018-12-10', ST_SetSRID(ST_MakePoint(78.1000, 9.9200), 4326));

-- Sample Budget History (20 records)
INSERT INTO budget_history (district, department, allocated_amount, spent_amount, asset_type, fiscal_year) VALUES
('Madurai Central', 'Public Works', 5000000, 4750000, 'Road', 2023),
('Madurai Central', 'Water Supply', 3000000, 2850000, 'Water Pipeline', 2023),
('Madurai North', 'Public Works', 4500000, 4200000, 'Road', 2023),
('Madurai North', 'Electricity', 2000000, 1900000, 'Street Light', 2023),
('Madurai South', 'Sanitation', 2500000, 2400000, 'Sewage', 2023),
('Madurai South', 'Public Works', 4000000, 3800000, 'Road', 2023),
('Madurai East', 'Water Supply', 3200000, 3100000, 'Water Pipeline', 2023),
('Madurai East', 'Electricity', 2100000, 2000000, 'Street Light', 2023),
('Madurai West', 'Public Works', 4800000, 4600000, 'Road', 2023),
('Madurai West', 'Sanitation', 2700000, 2600000, 'Sewage', 2023),
('Madurai Central', 'Public Works', 5200000, 5000000, 'Bridge', 2024),
('Madurai Central', 'Water Supply', 3100000, 2950000, 'Water Pipeline', 2024),
('Madurai North', 'Public Works', 4700000, 4500000, 'Road', 2024),
('Madurai North', 'Electricity', 2200000, 2100000, 'Street Light', 2024),
('Madurai South', 'Sanitation', 2800000, 2700000, 'Sewage', 2024),
('Madurai South', 'Public Works', 4200000, 4000000, 'Road', 2024),
('Madurai East', 'Water Supply', 3400000, 3250000, 'Water Pipeline', 2024),
('Madurai East', 'Electricity', 2300000, 2200000, 'Street Light', 2024),
('Madurai West', 'Public Works', 5000000, 4800000, 'Road', 2024),
('Madurai West', 'Sanitation', 2900000, 2800000, 'Sewage', 2024);

-- Sample Maintenance (5 records)
INSERT INTO maintenance_schedule (asset_id, maintenance_type, description, performed_by, cost, maintenance_date, status) VALUES
(1, 'Routine Inspection', 'Annual bridge inspection', 'ABC Construction', 25000, '2024-01-15', 'Completed'),
(2, 'Leak Repair', 'Fix minor pipeline leak', 'XYZ Plumbers', 15000, '2024-02-20', 'Completed'),
(3, 'Bulb Replacement', 'Replace street light bulbs', 'DEF Electricians', 5000, '2024-03-10', 'Scheduled'),
(4, 'Road Resurfacing', 'Repair road surface', 'PQR Contractors', 150000, '2024-04-05', 'In Progress'),
(5, 'Cleaning', 'Sewage line cleaning', 'GHI Services', 35000, '2024-05-12', 'Completed');

-- Sample Complaints (3 records)
INSERT INTO complaints (title, description, asset_type, assigned_agency, latitude, longitude, status, estimated_cost, approval_status) VALUES
('Pothole on Main Street', 'Large pothole causing traffic issues', 'Road', 'Public Works', 9.9252, 78.1198, 'Open', 50000, 'Pending'),
('Street Light Not Working', 'Street light pole #101 not functioning', 'Street Light', 'Electricity', 9.9100, 78.1150, 'In Progress', 8000, 'Approved'),
('Water Leak', 'Water pipeline leaking near market', 'Water Pipeline', 'Water Supply', 9.9400, 78.1200, 'Resolved', 25000, 'Approved');

-- ML Training Data: Asset Failure (40 records)
INSERT INTO asset_failure_training (asset_id, asset_type, failure_date, failure_type, age_at_failure, maintenance_count, total_cost, weather_condition, usage_intensity, failure_occurred) VALUES
(1,'Road','2023-01-15','Pothole',5,3,45000,'Rainy','High',true),
(2,'Bridge','2023-02-20','Crack',8,5,280000,'Normal','Medium',true),
(3,'Water Pipeline','2023-03-10','Leak',6,4,120000,'Hot','High',true),
(4,'Street Light','2023-04-05','Bulb Failure',3,2,8000,'Normal','Low',true),
(5,'Sewage','2023-05-12','Blockage',7,6,95000,'Rainy','High',true),
(6,'Road','2023-06-18','Surface Damage',4,2,38000,'Hot','High',true),
(7,'Bridge','2023-07-22','Structural Issue',10,7,350000,'Rainy','Medium',true),
(8,'Water Pipeline','2023-08-14','Burst',5,3,150000,'Normal','High',true),
(9,'Street Light','2023-09-09','Wiring Issue',4,3,12000,'Rainy','Low',true),
(10,'Sewage','2023-10-25','Overflow',6,5,85000,'Rainy','High',true),
(11,'Road','2023-11-30','Crack',7,4,52000,'Normal','Medium',true),
(12,'Bridge','2023-12-15','Paint Damage',6,4,45000,'Hot','Low',true),
(13,'Water Pipeline','2024-01-08','Corrosion',8,6,180000,'Normal','Medium',true),
(14,'Street Light','2024-02-14','Pole Damage',5,4,15000,'Rainy','Medium',true),
(15,'Sewage','2024-03-20','Blockage',5,4,78000,'Hot','High',true),
(16,'Road','2024-04-12','Pothole',3,1,28000,'Rainy','High',true),
(17,'Bridge','2024-05-18','Expansion Joint',9,6,290000,'Normal','Medium',true),
(18,'Water Pipeline','2024-06-22','Leak',4,2,95000,'Hot','High',true),
(19,'Street Light','2024-07-30','Bulb Failure',2,1,6000,'Normal','Low',true),
(20,'Sewage','2024-08-15','Pipe Damage',8,7,110000,'Rainy','High',true),
(21,'Road','2022-01-10','None',2,1,0,'Normal','Low',false),
(22,'Bridge','2022-02-15','None',3,2,0,'Normal','Low',false),
(23,'Water Pipeline','2022-03-20','None',2,1,0,'Normal','Medium',false),
(24,'Street Light','2022-04-25','None',1,1,0,'Normal','Low',false),
(25,'Sewage','2022-05-30','None',3,2,0,'Normal','Medium',false),
(26,'Road','2022-06-12','None',3,2,0,'Hot','Medium',false),
(27,'Bridge','2022-07-18','None',4,3,0,'Normal','Low',false),
(28,'Water Pipeline','2022-08-22','None',3,2,0,'Hot','Medium',false),
(29,'Street Light','2022-09-28','None',2,1,0,'Normal','Low',false),
(30,'Sewage','2022-10-15','None',4,3,0,'Rainy','Medium',false),
(31,'Road','2022-11-20','None',4,3,0,'Normal','Medium',false),
(32,'Bridge','2022-12-25','None',5,4,0,'Normal','Low',false),
(33,'Water Pipeline','2023-01-30','None',4,3,0,'Normal','Medium',false),
(34,'Street Light','2023-02-10','None',3,2,0,'Normal','Low',false),
(35,'Sewage','2023-03-15','None',5,4,0,'Hot','Medium',false),
(36,'Road','2023-04-20','None',5,4,0,'Normal','Medium',false),
(37,'Bridge','2023-05-25','None',6,5,0,'Normal','Low',false),
(38,'Water Pipeline','2023-06-30','None',5,4,0,'Hot','Medium',false),
(39,'Street Light','2023-07-12','None',4,3,0,'Normal','Low',false),
(40,'Sewage','2023-08-18','None',6,5,0,'Rainy','Medium',false);

-- Budget Optimization Data (15 records)
INSERT INTO budget_optimization_data (budget_id, year, quarter, department, allocated_amount, spent_amount, asset_type, project_count, efficiency_score) VALUES
(1,2023,1,'Public Works',5000000,4750000,'Road',12,0.95),
(2,2023,1,'Water Supply',3000000,2850000,'Water Pipeline',8,0.95),
(3,2023,2,'Public Works',5200000,5100000,'Bridge',5,0.98),
(4,2023,2,'Electricity',2000000,1900000,'Street Light',15,0.95),
(5,2023,3,'Sanitation',2500000,2400000,'Sewage',10,0.96),
(6,2023,3,'Public Works',4800000,4600000,'Road',11,0.96),
(7,2023,4,'Water Supply',3200000,3100000,'Water Pipeline',9,0.97),
(8,2023,4,'Electricity',2100000,2000000,'Street Light',16,0.95),
(9,2024,1,'Public Works',5500000,5200000,'Road',13,0.95),
(10,2024,1,'Sanitation',2700000,2600000,'Sewage',11,0.96),
(11,2024,2,'Public Works',5400000,5300000,'Bridge',6,0.98),
(12,2024,2,'Water Supply',3300000,3150000,'Water Pipeline',10,0.95),
(13,2024,3,'Electricity',2200000,2100000,'Street Light',17,0.95),
(14,2024,3,'Public Works',5000000,4800000,'Road',12,0.96),
(15,2024,4,'Sanitation',2800000,2700000,'Sewage',12,0.96);

-- Climate Risk Data (10 records)
INSERT INTO climate_risk_data (location_id, latitude, longitude, district, flood_risk_score, heat_vulnerability_score, environmental_impact_score, resilience_score, elevation, drainage_quality, vegetation_cover) VALUES
(1,9.9252,78.1198,'Madurai Central',0.65,0.78,0.55,0.72,120,0.60,0.45),
(2,9.9400,78.1200,'Madurai North',0.45,0.82,0.48,0.68,135,0.75,0.52),
(3,9.9100,78.1150,'Madurai South',0.72,0.75,0.62,0.65,110,0.55,0.40),
(4,9.9300,78.1400,'Madurai East',0.58,0.80,0.52,0.70,125,0.68,0.48),
(5,9.9200,78.1000,'Madurai West',0.50,0.76,0.58,0.74,140,0.72,0.55),
(6,9.9350,78.1250,'Madurai Central',0.68,0.79,0.54,0.71,118,0.62,0.43),
(7,9.9450,78.1180,'Madurai North',0.42,0.83,0.46,0.69,138,0.78,0.54),
(8,9.9050,78.1120,'Madurai South',0.75,0.74,0.64,0.64,108,0.52,0.38),
(9,9.9280,78.1420,'Madurai East',0.60,0.81,0.50,0.71,122,0.70,0.50),
(10,9.9180,78.0980,'Madurai West',0.48,0.77,0.60,0.75,142,0.74,0.57);

-- Contractor Performance Data (10 records)
INSERT INTO contractor_performance (contractor_id, contractor_name, project_count, avg_completion_time, quality_rating, cost_efficiency, reliability_score, on_time_delivery, customer_satisfaction) VALUES
(1,'ABC Construction',45,18.5,4.2,0.85,0.88,0.92,4.3),
(2,'XYZ Builders',32,22.3,3.8,0.78,0.82,0.85,3.9),
(3,'PQR Infrastructure',58,16.2,4.5,0.92,0.91,0.95,4.6),
(4,'LMN Services',28,20.1,4.0,0.80,0.85,0.88,4.1),
(5,'DEF Contractors',41,19.8,4.3,0.87,0.89,0.90,4.4),
(6,'GHI Builders',35,21.5,3.9,0.79,0.83,0.86,4.0),
(7,'JKL Construction',52,17.8,4.4,0.89,0.90,0.93,4.5),
(8,'MNO Services',25,23.2,3.7,0.76,0.80,0.82,3.8),
(9,'STU Infrastructure',48,18.9,4.1,0.84,0.87,0.91,4.2),
(10,'VWX Contractors',38,20.5,4.0,0.81,0.86,0.89,4.1);

-- Cascading Failures Data (10 records)
INSERT INTO cascading_failures (pattern_id, primary_asset_type, secondary_asset_type, cascade_probability, avg_cascade_time_hours, impact_severity, historical_occurrences, mitigation_cost) VALUES
(1,'Water Pipeline','Road',0.75,48,'High',15,250000),
(2,'Sewage','Water Pipeline',0.65,72,'Medium',12,180000),
(3,'Electricity','Street Light',0.85,24,'Low',20,50000),
(4,'Road','Bridge',0.55,120,'High',8,400000),
(5,'Bridge','Road',0.70,96,'Medium',10,300000),
(6,'Water Pipeline','Sewage',0.60,60,'Medium',11,200000),
(7,'Electricity','Water Pipeline',0.40,36,'Low',5,120000),
(8,'Road','Water Pipeline',0.50,84,'Medium',9,220000),
(9,'Sewage','Road',0.45,90,'Low',7,150000),
(10,'Bridge','Water Pipeline',0.35,108,'Low',4,180000);

SELECT 'Database setup complete with all tables and sample data!' as message;
