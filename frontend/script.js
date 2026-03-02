const API_BASE = 'http://localhost:5000/api';
let currentUser = null;

const map = L.map('map').setView([9.9252, 78.1198], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let markersLayer = L.layerGroup().addTo(map);

function getColor(status, breached) {
    if (breached) return "#ef4444";
    if (status === "Active") return "#10b981";
    if (status === "Maintenance") return "#f59e0b";
    if (status === "Inactive") return "#6b7280";
    return "#3b82f6";
}

function authFetch(url, options = {}) {
    options.headers = options.headers || {};
    const token = localStorage.getItem('token');
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, options);
}

async function loadAssets() {
    try {
        markersLayer.clearLayers();
        
        const assetsRes = await authFetch(`${API_BASE}/assets`);
        if (assetsRes.status === 401) return;
        
        const assets = await assetsRes.json();
        const breachRes = await authFetch(`${API_BASE}/sla/breaches`);
        const breaches = await breachRes.json();
        const breachedAssetIds = breaches.map(b => b.asset_id);

        assets.forEach(asset => {
            if (!asset.location) return;
            
            const coords = asset.location.coordinates;
            const isBreached = breachedAssetIds.includes(asset.id);
            
            const marker = L.circleMarker([coords[1], coords[0]], {
                radius: 9,
                color: getColor(asset.status, isBreached),
                fillOpacity: 0.9
            });

            if (isBreached) {
                marker._path.classList.add("blink");
            }

            marker.bindPopup(`
                <b>${asset.name}</b><br>
                Type: ${asset.type}<br>
                Status: ${asset.status}<br>
                SLA Breach: ${isBreached ? "YES" : "NO"}
            `);

            marker.addTo(markersLayer);
        });
    } catch (error) {
        console.error('Error loading assets:', error);
    }
}

map.on('click', async function (e) {
    if (!currentUser || !['Admin', 'Officer'].includes(currentUser.role)) {
        showAlert('Only Admin and Officer can add assets', 'error');
        return;
    }

    const name = prompt("Enter Asset Name:");
    const type = prompt("Enter Asset Type:");
    const status = prompt("Enter Status (Active / Maintenance / Inactive):");

    if (!name || !type) return;

    try {
        const res = await authFetch(`${API_BASE}/assets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                type,
                status,
                location: {
                    type: "Point",
                    coordinates: [e.latlng.lng, e.latlng.lat]
                }
            })
        });

        if (res.ok) {
            showAlert("Asset Added Successfully", 'success');
            loadAssets();
        } else {
            const data = await res.json();
            showAlert(data.message || 'Failed to add asset', 'error');
        }
    } catch (error) {
        showAlert('Error adding asset', 'error');
    }
});

function updateUIForAuth() {
    const token = localStorage.getItem('token');
    const authSection = document.getElementById('authSection');
    const navSection = document.getElementById('navSection');
    const sidebar = document.getElementById('sidebar');
    
    if (token && currentUser) {
        authSection.style.display = 'none';
        navSection.style.display = 'flex';
        sidebar.style.display = 'block';
        document.getElementById('userInfo').textContent = `${currentUser.name} (${currentUser.role})`;
    } else {
        authSection.style.display = 'flex';
        navSection.style.display = 'none';
        sidebar.style.display = 'none';
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showAlert('Please enter email and password', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showAlert('Login successful!', 'success');
            updateUIForAuth();
            loadAssets();
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
        } else {
            showAlert(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showAlert('Network error', 'error');
    }
}

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showAlert('Please enter email and password', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: email.split('@')[0], 
                email, 
                password 
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showAlert('Registration successful! Please login.', 'success');
            document.getElementById('password').value = '';
        } else {
            showAlert(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showAlert('Network error', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateUIForAuth();
    markersLayer.clearLayers();
    hideDataPanel();
    showAlert('Logged out successfully', 'success');
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '100px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '250px';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

function renderTable(rows, title) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return '<p>No records found.</p>';
    }
    
    let html = `<table><thead><tr>`;
    Object.keys(rows[0]).forEach(k => {
        html += `<th>${k.replace(/_/g, ' ').toUpperCase()}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    rows.forEach(r => {
        html += '<tr>';
        Object.values(r).forEach(v => {
            html += `<td>${v !== null && v !== undefined ? v : '-'}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

function showDataPanel(title, content) {
    document.getElementById('panelTitle').textContent = title;
    document.getElementById('panelContent').innerHTML = content;
    document.getElementById('dataPanel').style.display = 'block';
}

function hideDataPanel() {
    document.getElementById('dataPanel').style.display = 'none';
}

async function showAssets() {
    try {
        const res = await authFetch(`${API_BASE}/assets`);
        const data = await res.json();
        
        if (!res.ok) {
            showAlert(data.message || 'Error fetching assets', 'error');
            return;
        }
        
        showDataPanel('Assets', renderTable(data));
    } catch (error) {
        showAlert('Error loading assets', 'error');
    }
}

async function showDashboard() {
    try {
        const res = await authFetch(`${API_BASE}/dashboard`);
        const stats = await res.json();
        
        if (!res.ok) {
            showAlert(stats.message || 'Error fetching dashboard', 'error');
            return;
        }
        
        let html = '<div class="stats-grid">';
        html += `<div class="stat-card"><div class="stat-value">${stats.total_assets}</div><div class="stat-label">Total Assets</div></div>`;
        html += `<div class="stat-card"><div class="stat-value">${stats.active_assets}</div><div class="stat-label">Active Assets</div></div>`;
        html += `<div class="stat-card"><div class="stat-value">${stats.under_maintenance_assets}</div><div class="stat-label">Under Maintenance</div></div>`;
        html += `<div class="stat-card"><div class="stat-value">$${stats.total_maintenance_cost}</div><div class="stat-label">Total Cost</div></div>`;
        html += '</div>';
        
        if (stats.status_distribution && stats.status_distribution.length > 0) {
            html += '<h4 style="margin-top:1rem;">Status Distribution</h4>';
            html += renderTable(stats.status_distribution);
        }
        
        showDataPanel('Dashboard Overview', html);
    } catch (error) {
        showAlert('Error loading dashboard', 'error');
    }
}

function showExport() {
    const html = `
        <div class="export-links">
            <a href="${API_BASE}/export/assets/csv" class="export-link" target="_blank">📄 Assets CSV</a>
            <a href="${API_BASE}/export/maintenance/csv" class="export-link" target="_blank">📄 Maintenance CSV</a>
            <a href="${API_BASE}/export/dashboard/pdf" class="export-link" target="_blank">📑 Dashboard PDF</a>
        </div>
    `;
    showDataPanel('Export Options', html);
}

async function showMaintenance() {
    try {
        const res = await authFetch(`${API_BASE}/maintenance`);
        const data = await res.json();
        
        if (!res.ok) {
            showAlert(data.message || 'Error fetching maintenance', 'error');
            return;
        }
        
        showDataPanel('Maintenance Records', renderTable(data));
    } catch (error) {
        showAlert('Error loading maintenance', 'error');
    }
}

async function showSLA() {
    try {
        const res = await authFetch(`${API_BASE}/sla/breaches`);
        const data = await res.json();
        
        if (!res.ok) {
            showAlert(data.message || 'Error fetching SLA', 'error');
            return;
        }
        
        showDataPanel('SLA Breaches', renderTable(data));
    } catch (error) {
        showAlert('Error loading SLA data', 'error');
    }
}

function showMapView() {
    hideDataPanel();
    loadAssets();
}

document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('registerBtn').addEventListener('click', register);
document.getElementById('logoutBtn').addEventListener('click', logout);

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        const view = this.getAttribute('data-view');
        const viewMap = {
            'map': showMapView,
            'assets': showAssets,
            'dashboard': showDashboard,
            'export': showExport,
            'maintenance': showMaintenance,
            'sla': showSLA
        };
        
        if (viewMap[view]) {
            viewMap[view]();
        }
    });
});

document.getElementById('email').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});

document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});

updateUIForAuth();
setInterval(() => {
    if (currentUser) loadAssets();
}, 30000);
