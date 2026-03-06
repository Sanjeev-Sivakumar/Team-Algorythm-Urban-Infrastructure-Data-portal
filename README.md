# Urban Infrastructure Management System

Complete web-based platform for managing urban infrastructure with GIS, real-time monitoring, complaint management, and advanced ML-powered features.

## Quick Start

### 1. Database Setup
Open pgAdmin → Create database `urban_infra` → Run `backend/models/final.sql` in Query Tool

### 2. Backend Setup
```bash
cd backend
npm install
npm start
```

### 3. Frontend
Open `frontend/login.html` in browser

### 4. First Login
Register as **Admin** role with email: admin@test.com, password: admin123

---

## Features

### Core Features
- Asset Management - Create, view, update, delete infrastructure assets
- GIS Mapping - Interactive maps with Leaflet.js, colored markers, heatmap
- Complaint Management - Three-tier workflow (Citizen → Officer → Admin)
- Maintenance Tracking - Schedule and monitor maintenance activities
- SLA Monitoring - Automatic breach detection
- Dashboard Analytics - Real-time statistics and charts
- Data Export - CSV and PDF export (Admin only)

### Advanced Features (Admin Only)
- ML Predictions - Asset failure forecasting, maintenance prediction, budget optimization
- Blockchain - Smart contract escrow with work proof verification
- Climate Risk - Flood, heat, environmental impact assessment
- Simulations - Budget, strategy, and cascading failure simulations
- Optimization - Contractor assignment, workforce routing, emergency response

---

## Role-Based Access

| Feature | Admin | Officer | Citizen | Viewer |
|---------|-------|---------|---------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Create Assets | ✅ | ✅ | ❌ | ❌ |
| Edit/Delete Assets | ✅ | ✅/❌ | ❌ | ❌ |
| Report Complaints | ✅ | ✅ | ✅ | ❌ |
| Estimate/Approve | ✅ | ✅/❌ | ❌ | ❌ |
| Export Data | ✅ | ❌ | ❌ | ❌ |
| Advanced Features | ✅ | ❌ | ❌ | ❌ |

---

## Tech Stack

**Backend:** Node.js, Express.js, PostgreSQL 12+ with PostGIS, JWT Authentication, bcrypt

**Frontend:** Vanilla JavaScript (ES6+), Leaflet.js (Maps), Chart.js (Analytics), Custom CSS

---

## Environment Variables

Create `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=urban_infra
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

---

## Sample Data

Add test assets in pgAdmin Query Tool:
```sql
INSERT INTO assets (name, type, department, status, installation_date, geometry) VALUES
('Main Road Bridge', 'Bridge', 'Public Works', 'Good', '2020-01-15', 
 ST_SetSRID(ST_MakePoint(78.1198, 9.9252), 4326)),
('Central Water Pipeline', 'Water Pipeline', 'Water Supply', 'Good', '2019-06-20', 
 ST_SetSRID(ST_MakePoint(78.1200, 9.9400), 4326)),
('Street Light Pole 101', 'Street Light', 'Electricity', 'Good', '2021-03-10', 
 ST_SetSRID(ST_MakePoint(78.1150, 9.9100), 4326));
```

---

## Troubleshooting

**Backend won't start:** Check PostgreSQL running, verify database exists, check .env

**Advanced features not showing:** Login as Admin role only

**Dropdowns empty:** Create assets first, then refresh browser

**Database errors:** Re-run final.sql in pgAdmin

---

## License

ISC

## Author

Sanjeev Kumar S
