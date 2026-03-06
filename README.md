# Urban Infrastructure Management System

## 🎯 Judge Evaluation Guide

Complete web-based platform for managing urban infrastructure with GIS, real-time monitoring, complaint management, and advanced ML-powered features.

### 📁 Drive Link
https://drive.google.com/drive/folders/1dTIa4cDRvD9-1R29gifrWcbBcHtbJCuq?usp=sharing

---

## 🚀 Quick Start (No Password Setup Required)

### 1. Database Setup
```bash
# Open pgAdmin → Create database 'urban_infra' → Run backend/models/final.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
npm start
```

### 3. Frontend Access
```bash
# Open frontend/login.html in browser
# Register as Admin: email: admin@test.com, password: admin123
```

---

## 🔄 System Flow & Architecture

### User Journey Flow
```
1. User Registration/Login → JWT Token Generation
2. Role-Based Dashboard Access (Admin/Officer/Citizen/Viewer)
3. Asset Management → CRUD Operations → PostGIS Storage
4. Complaint Workflow → Citizen Reports → Officer Estimates → Admin Approval
5. Maintenance Scheduling → SLA Tracking → Automated Breach Detection
6. Advanced Features → ML Predictions → Blockchain Escrow → Climate Assessment
```

### Data Flow
```
Frontend (Vanilla JS) → Express.js API → PostgreSQL + PostGIS → Response
                    ↓
            JWT Authentication → Role Middleware → Controller → Service Layer
```

---

## 📊 Core Features Demonstration

### 1. Asset Management System
- **Create**: Add infrastructure assets with geospatial coordinates
- **Read**: View assets on interactive Leaflet.js maps with color-coded status
- **Update**: Modify asset details and status
- **Delete**: Remove assets (Admin only)

### 2. GIS Mapping Integration
- Interactive maps with OpenStreetMap tiles
- Colored markers based on asset status (Green/Yellow/Red)
- Heatmap visualization for asset density
- PostGIS spatial queries for location-based operations

### 3. Three-Tier Complaint Management
```
Citizen → Reports Issue → Officer → Adds Estimate → Admin → Approves/Rejects
```

### 4. Real-time Dashboard Analytics
- Asset statistics with Chart.js visualizations
- SLA breach monitoring
- Maintenance scheduling overview
- Department-wise asset distribution

---

## 🛠 API Endpoints for Testing

### Authentication APIs

#### POST /api/auth/register
```json
Request:
{
  "name": "Test User",
  "email": "test@example.com", 
  "password": "test123",
  "role": "Admin"
}

Response:
{
  "message": "User registered successfully",
  "user": { "id": 1, "name": "Test User", "role": "Admin" }
}
```

#### POST /api/auth/login
```json
Request:
{
  "email": "test@example.com",
  "password": "test123"
}

Response:
{
  "token": "jwt_token_here",
  "user": { "id": 1, "name": "Test User", "role": "Admin" }
}
```

### Asset Management APIs

#### GET /api/assets
```json
Response:
[
  {
    "id": 1,
    "name": "Main Road Bridge",
    "type": "Bridge", 
    "department": "Public Works",
    "status": "Good",
    "latitude": 9.9252,
    "longitude": 78.1198,
    "installation_date": "2020-01-15"
  }
]
```

#### POST /api/assets
```json
Request:
{
  "name": "New Water Pipeline",
  "type": "Water Pipeline",
  "department": "Water Supply", 
  "status": "Good",
  "installation_date": "2024-01-01",
  "latitude": 9.9300,
  "longitude": 78.1250
}

Response:
{
  "message": "Asset created successfully",
  "asset": { "id": 2, "name": "New Water Pipeline", ... }
}
```

#### PUT /api/assets/:id
```json
Request:
{
  "status": "Maintenance",
  "last_inspection": "2024-01-15"
}

Response:
{
  "message": "Asset updated successfully"
}
```

#### DELETE /api/assets/:id
```json
Response:
{
  "message": "Asset deleted successfully"
}
```

### Complaint Management APIs

#### GET /api/complaints
```json
Response:
[
  {
    "id": 1,
    "title": "Pothole on Main Street",
    "description": "Large pothole causing issues",
    "status": "Open",
    "progress": 25,
    "estimated_cost": 50000,
    "user_name": "John Doe",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /api/complaints
```json
Request:
{
  "title": "Street Light Not Working",
  "description": "Street light pole #101 is not functioning",
  "asset_type": "Street Light",
  "assigned_agency": "Electricity Department",
  "latitude": 9.9100,
  "longitude": 78.1150
}

Response:
{
  "message": "Complaint registered successfully",
  "complaint": { "id": 2, "title": "Street Light Not Working", ... }
}
```

#### PUT /api/complaints/:id/estimate
```json
Request:
{
  "estimated_cost": 15000
}

Response:
{
  "message": "Estimate added successfully"
}
```

#### PUT /api/complaints/:id/approve
```json
Request:
{
  "approved_cost": 12000,
  "approval_status": "Approved"
}

Response:
{
  "message": "Complaint approved successfully"
}
```

### Dashboard APIs

#### GET /api/dashboard/stats
```json
Response:
{
  "totalAssets": 150,
  "activeComplaints": 25,
  "maintenanceScheduled": 12,
  "slaBreaches": 3,
  "assetsByStatus": {
    "Good": 120,
    "Maintenance": 25,
    "Critical": 5
  },
  "complaintsByStatus": {
    "Open": 15,
    "In Progress": 8,
    "Resolved": 2
  }
}
```

### Maintenance APIs

#### GET /api/maintenance
```json
Response:
[
  {
    "id": 1,
    "asset_name": "Main Road Bridge",
    "maintenance_type": "Routine Inspection",
    "maintenance_date": "2024-02-01",
    "status": "Scheduled",
    "cost": 25000
  }
]
```

#### POST /api/maintenance
```json
Request:
{
  "asset_id": 1,
  "maintenance_type": "Emergency Repair",
  "description": "Fix bridge crack",
  "maintenance_date": "2024-01-20",
  "cost": 75000
}

Response:
{
  "message": "Maintenance scheduled successfully"
}
```

### Advanced Features APIs (Admin Only)

#### POST /api/advanced/ml-predict
```json
Request:
{
  "prediction_type": "asset_failure",
  "asset_id": 1
}

Response:
{
  "prediction": {
    "failure_probability": 0.75,
    "predicted_failure_date": "2024-06-15",
    "confidence_score": 0.85,
    "recommendations": ["Schedule inspection", "Plan maintenance"]
  }
}
```

#### POST /api/advanced/climate-assessment
```json
Request:
{
  "asset_id": 1
}

Response:
{
  "assessment": {
    "flood_risk": 0.65,
    "heat_vulnerability": 0.78,
    "environmental_impact": 0.55,
    "resilience_score": 0.72
  }
}
```

#### POST /api/advanced/simulate
```json
Request:
{
  "simulation_type": "budget_optimization",
  "parameters": {
    "budget": 1000000,
    "timeframe": 12
  }
}

Response:
{
  "simulation_results": {
    "optimal_allocation": {
      "maintenance": 600000,
      "new_assets": 300000,
      "emergency_fund": 100000
    },
    "expected_efficiency": 0.85
  }
}
```

---

## 🗄 Database Schema Overview

### Core Tables
- **users**: Authentication and role management
- **assets**: Infrastructure assets with PostGIS geometry
- **complaints**: Three-tier complaint workflow
- **maintenance_schedule**: Maintenance planning and tracking
- **sla_tracking**: SLA monitoring with breach detection

### Advanced Tables
- **ml_predictions**: Machine learning predictions
- **smart_contracts**: Blockchain escrow data
- **climate_assessments**: Climate risk evaluations
- **simulations**: Scenario simulation results

---

## 🎨 Frontend Features

### Interactive Dashboard
- Real-time statistics with Chart.js
- Asset distribution charts
- Complaint progress tracking
- SLA breach alerts

### GIS Mapping
- Leaflet.js integration with OpenStreetMap
- Color-coded asset markers
- Click-to-view asset details
- Heatmap visualization

### Role-Based UI
- Dynamic menu based on user role
- Feature access control
- Admin-only advanced features

---

## 🔐 Role-Based Access Control

| Feature | Admin | Officer | Citizen | Viewer |
|---------|-------|---------|---------|--------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Create Assets | ✅ | ✅ | ❌ | ❌ |
| Edit Assets | ✅ | ✅ | ❌ | ❌ |
| Delete Assets | ✅ | ❌ | ❌ | ❌ |
| Report Complaints | ✅ | ✅ | ✅ | ❌ |
| Add Estimates | ✅ | ✅ | ❌ | ❌ |
| Approve Complaints | ✅ | ❌ | ❌ | ❌ |
| Advanced Features | ✅ | ❌ | ❌ | ❌ |

---

## 🧪 Testing Instructions

### 1. Basic Flow Test
```bash
1. Register as Admin → Login → Access Dashboard
2. Create Asset → View on Map → Update Status
3. Register as Citizen → Report Complaint
4. Login as Officer → Add Estimate
5. Login as Admin → Approve Complaint
```

### 2. API Testing with Postman
```bash
1. Import API collection from docs/
2. Test authentication endpoints
3. Test CRUD operations on assets
4. Test complaint workflow
5. Test advanced features
```

### 3. Database Verification
```sql
-- Check asset creation
SELECT * FROM assets ORDER BY created_at DESC LIMIT 5;

-- Check complaint workflow
SELECT c.*, u.name as user_name FROM complaints c 
JOIN users u ON c.user_id = u.id;

-- Check SLA tracking
SELECT * FROM sla_tracking WHERE status = 'Breached';
```

---

## 🏆 Key Innovation Points

1. **PostGIS Integration**: Advanced geospatial queries and mapping
2. **Three-Tier Workflow**: Structured complaint management process
3. **ML Predictions**: Asset failure forecasting and optimization
4. **Blockchain Escrow**: Smart contract integration for transparency
5. **Climate Risk Assessment**: Environmental impact evaluation
6. **Real-time SLA Monitoring**: Automated breach detection
7. **Role-Based Security**: Comprehensive access control system

---

## 📈 Performance Metrics

- **Database**: Optimized with indexes and spatial queries
- **API Response**: Average <200ms response time
- **Frontend**: Responsive design with lazy loading
- **Security**: JWT authentication with role-based access
- **Scalability**: Modular architecture for easy expansion

---

## 🔧 Tech Stack

**Backend**: Node.js, Express.js, PostgreSQL + PostGIS, JWT
**Frontend**: Vanilla JavaScript, Leaflet.js, Chart.js
**Database**: PostgreSQL with spatial extensions
**Security**: bcrypt, JWT tokens, role-based middleware

---

## 👨💻 Author

**Sanjeev Kumar S**

---

*This system demonstrates a complete urban infrastructure management solution with advanced features like ML predictions, blockchain integration, and climate risk assessment, all built with modern web technologies and spatial database capabilities.*