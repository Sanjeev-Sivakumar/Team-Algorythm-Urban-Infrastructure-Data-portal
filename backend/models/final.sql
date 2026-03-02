-- =====================================================
-- URBAN INFRASTRUCTURE PORTAL - COMPLETE DATABASE
-- Single file to setup entire database
-- =====================================================

DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS sla_tracking CASCADE;
DROP TABLE IF EXISTS maintenance_schedule CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
-- Users table NOT dropped to preserve existing accounts

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

SELECT 'Database setup complete!' as message;