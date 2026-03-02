# Urban Infrastructure Management System

A comprehensive web-based platform for managing urban infrastructure assets with GIS capabilities, real-time monitoring, complaint management, and role-based access control.

## Quick Start

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+) with PostGIS extension

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd urban-infra-portal
```

2. **Setup Database**
```bash
# Login to PostgreSQL
psql -U postgres

# Create database and enable PostGIS
CREATE DATABASE urban_infra;
\c urban_infra
CREATE EXTENSION postgis;

# Run schema
\i backend/models/final.sql
\q
```

3. **Configure Backend**
```bash
cd backend
npm install

# Edit .env file if needed (default settings work for local development)
```

4. **Start Backend**
```bash
npm start
# Server runs on http://localhost:5000
```

5. **Open Frontend**
```bash
# Option 1: Direct file access
# Open frontend/login.html in browser

# Option 2: Using http-server
cd frontend
npx http-server -p 8080
# Open http://localhost:8080/login.html
```

6. **First Login**
- Register as Admin role
- Login with credentials
- Start managing infrastructure!

---

## Features

### Core Functionality
- **Asset Management**: Create, view, update, delete infrastructure assets with GPS coordinates
- **Interactive GIS Map**: Real-time visualization with Leaflet.js, colored markers, and heatmap view
- **Complaint Management**: Three-tier workflow (Citizen → Officer → Admin) with cost approval
- **Maintenance Tracking**: Schedule and monitor maintenance activities with progress tracking
- **SLA Monitoring**: Automatic breach detection with 24-hour default SLA
- **Dashboard Analytics**: Real-time statistics, charts, and insights
- **Data Export**: CSV and PDF export with district-based location mapping (Admin only)

### Role-Based Access Control
- **Admin**: Full system control, cost approval, agency assignment, report exports
- **Officer**: Field operations, cost estimation, progress updates
- **Viewer**: Read-only access to all data
- **Citizen**: Complaint reporting and tracking

### Advanced Features
- Auto-location detection using browser GPS
- Colored map markers (Green: Assets, Red: Complaints, Orange: Maintenance)
- 200m radius regions around assets
- Cost limits per asset type (Rs 50K - 5L)
- District detection from lat/lon coordinates
- Real-time progress bars and status badges
- Responsive design for mobile and desktop

---

## Tech Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: PostgreSQL 12+ with PostGIS extension
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcrypt password hashing (10 rounds)
- **API**: RESTful architecture

### Frontend
- **Core**: Vanilla JavaScript (ES6+)
- **Mapping**: Leaflet.js + Leaflet.heat
- **Charts**: Chart.js
- **Styling**: Custom CSS with Poppins font (15px base)
- **Design**: Responsive, gradient theme (#667eea → #764ba2)

### Database
- **PostGIS**: Spatial data and geometry handling
- **Triggers**: Auto-update asset status, SLA breach detection
- **Constraints**: Cost validation, status checks, progress ranges

---

## Project Structure

```
urban-infra-portal/
├── backend/
│   ├── config/
│   │   └── db.js                 # PostgreSQL connection
│   ├── controllers/
│   │   ├── authController.js     # Login/Register
│   │   ├── assetController.js    # Asset CRUD
│   │   ├── complaintController.js # Complaint workflow
│   │   ├── maintenanceController.js
│   │   ├── slaController.js
│   │   ├── dashboardController.js
│   │   └── exportController.js   # CSV/PDF exports
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   └── roleMiddleware.js     # Role-based access
│   ├── models/
│   │   └── final.sql             # Complete database schema
│   ├── routes/
│   │   └── *.js                  # API route definitions
│   ├── utils/
│   │   ├── csvGenerator.js
│   │   └── pdfGenerator.js
│   ├── .env                      # Environment variables
│   ├── app.js                    # Express app entry point
│   └── package.json
├── frontend/
│   ├── login.html                # Login/Register page
│   ├── dashboard.html            # Main application
│   ├── dashboard.js              # Core functionality
│   └── styles.css                # Styling
└── README.md
```

---

## Environment Variables

Create `backend/.env` file:

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

## Database Schema

### Tables
1. **users**: Authentication and role management
2. **assets**: Infrastructure assets with PostGIS geometry
3. **complaints**: Citizen complaints with workflow fields
4. **maintenance_schedule**: Maintenance tracking
5. **sla_tracking**: SLA monitoring with auto-breach detection

### Key Features
- PostGIS geometry for spatial queries
- Automatic triggers for status updates
- Foreign key constraints for data integrity
- Check constraints for validation

---

## Complaint Workflow

```
1. Citizen Reports → Status: Open, Progress: 0%
2. Officer Estimates → Adds cost estimate, assigns agency
3. Admin Approves → Reviews and approves cost (with limits)
4. Work Progress → Officer updates progress (0-100%)
5. Admin Closes → Adds resolution notes, Status: Closed
```

### Cost Limits (Admin Approval Required)
- Road/Bridge: Rs 5,00,000
- Water/Sewage: Rs 3,00,000
- Electricity: Rs 2,00,000
- Street Light: Rs 50,000
- Park: Rs 1,00,000
- Building: Rs 4,00,000

---

## Map Features

### Markers
- **Green Markers**: Infrastructure assets
- **Red Markers**: Citizen complaints
- **Orange Markers**: Maintenance activities

### Visualization
- Colored regions (200m radius) around assets
- Heatmap toggle for density analysis
- Auto-location detection
- Interactive popups with asset details

### Legend
- Assets: Green markers
- Complaints: Red markers
- Maintenance: Orange markers

---

## Export Features (Admin Only)

### CSV Export
- Assets with district location
- Complaints with district location
- Maintenance records

### PDF Export
- Assets report
- Complaints report
- Maintenance report

### District Detection
Automatically maps coordinates to districts:
- Madurai Central
- Madurai North
- Madurai South
- Madurai East
- Madurai West

---

## Security Features

- JWT-based authentication with 1-day expiration
- bcrypt password hashing (10 rounds)
- Role-based middleware protection
- SQL injection prevention (parameterized queries)
- CORS configuration
- Environment variable secrets

---

## UI/UX Features

- Modern gradient theme (purple/blue)
- Poppins font family (15px base)
- Responsive design for all devices
- Smooth animations and transitions
- Status-based color coding
- Progress bars and badges
- Modal-based forms
- Real-time chart updates

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Assets
- `GET /api/assets` - List all assets
- `GET /api/assets/:id` - Get single asset
- `POST /api/assets` - Create asset (Admin/Officer)
- `PUT /api/assets/:id` - Update asset (Admin/Officer)
- `DELETE /api/assets/:id` - Delete asset (Admin)

### Complaints
- `GET /api/complaints` - List all complaints
- `GET /api/complaints/:id` - Get single complaint
- `POST /api/complaints` - Create complaint
- `PUT /api/complaints/:id/estimate` - Officer estimate (Officer/Admin)
- `PUT /api/complaints/:id/approve` - Admin approval (Admin)
- `PUT /api/complaints/:id/close` - Close complaint (Admin)
- `PUT /api/complaints/:id/progress` - Update progress (Officer/Admin)

### Maintenance
- `GET /api/maintenance` - List maintenance records
- `POST /api/maintenance` - Create maintenance
- `PUT /api/maintenance/:id` - Update maintenance
- `DELETE /api/maintenance/:id` - Delete maintenance

### SLA
- `GET /api/sla` - List SLA records
- `GET /api/sla/breaches` - Get breached SLAs

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

### Export (Admin Only)
- `GET /api/export/assets/csv` - Export assets CSV
- `GET /api/export/assets/pdf` - Export assets PDF
- `GET /api/export/complaints/csv` - Export complaints CSV
- `GET /api/export/complaints/pdf` - Export complaints PDF
- `GET /api/export/maintenance/csv` - Export maintenance CSV
- `GET /api/export/maintenance/pdf` - Export maintenance PDF

---

## Testing

### Manual Testing
1. Register users with different roles
2. Login as Admin and create assets
3. Login as Citizen and report complaint
4. Login as Officer and add estimate
5. Login as Admin and approve cost
6. Update progress and close complaint
7. Test export functionality (Admin only)

### Test Credentials
Create test users via registration with roles:
- Admin: Full access
- Officer: Operational access
- Viewer: Read-only access

---

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running
- Verify database exists and PostGIS is enabled
- Check .env file configuration
- Run `npm install` again

### Map doesn't load
- Check internet connection (needs OpenStreetMap tiles)
- Verify Leaflet CDN is accessible
- Check browser console for errors

### Location detection fails
- Browser needs HTTPS or localhost
- User must grant location permission
- Use manual coordinates as fallback

### Database errors
- Ensure final.sql was run completely
- Check all tables exist: `\dt` in psql
- Verify PostGIS extension: `\dx`

---

## License

ISC

---

## Author

Sanjeev Kumar S

---

## Acknowledgments

- OpenStreetMap for map tiles
- Leaflet.js for mapping library
- Chart.js for data visualization
- PostgreSQL + PostGIS for spatial database

---

## Support

For issues or questions, please create an issue in the repository.

---


