const API_BASE = 'http://localhost:5000/api';
let currentUser = null;
let map, markersLayer, heatmapLayer, regionsLayer, complaintsLayer;
let userLocation = null;
let showingHeatmap = false;

const greenIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const orangeIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initMap();
    requestLocation();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = JSON.parse(user);
    document.getElementById('userInfo').textContent = `${currentUser.name} (${currentUser.role})`;
    
    if (currentUser.role === 'Viewer') {
        const addBtn = document.getElementById('addAssetBtn');
        if (addBtn) addBtn.style.display = 'none';
    }
    
    if (currentUser.role === 'Admin') {
        document.getElementById('exportAssetsCsv').style.display = 'inline-block';
        document.getElementById('exportAssetsPdf').style.display = 'inline-block';
        document.getElementById('exportComplaintsCsv').style.display = 'inline-block';
        document.getElementById('exportComplaintsPdf').style.display = 'inline-block';
        document.getElementById('exportMaintenanceCsv').style.display = 'inline-block';
        document.getElementById('exportMaintenancePdf').style.display = 'inline-block';
    }
    
    // Hide advanced features for non-admin users
    const advancedMenuItem = document.querySelector('.menu-item[onclick="showView(\'advanced\')"');
    if (advancedMenuItem && currentUser.role !== 'Admin') {
        advancedMenuItem.style.display = 'none';
    }
    
    loadDashboard();
}

function authFetch(url, options = {}) {
    options.headers = options.headers || {};
    const token = localStorage.getItem('token');
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, options);
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function initMap() {
    map = L.map('map', {
        center: [9.9252, 78.1198],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
        minZoom: 3
    }).addTo(map);
    
    markersLayer = L.layerGroup().addTo(map);
    regionsLayer = L.layerGroup().addTo(map);
    complaintsLayer = L.layerGroup().addTo(map);
    
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

function requestLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setView([userLocation.lat, userLocation.lng], 13);
                L.marker([userLocation.lat, userLocation.lng])
                    .addTo(map)
                    .bindPopup('Your Location')
                    .openPopup();
            },
            (error) => {
                console.log('Location access denied');
            }
        );
    }
}

function detectLocation() {
    if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 15);
    } else {
        requestLocation();
    }
}

async function loadDashboard() {
    try {
        const res = await authFetch(`${API_BASE}/dashboard`);
        const stats = await res.json();
        
        renderStats(stats);
        if (currentUser.role !== 'Viewer') {
            renderCharts(stats);
        }
        loadAssets();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function renderStats(stats) {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.total_assets || 0}</div>
            <div class="stat-label">Total Assets</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.active_assets || 0}</div>
            <div class="stat-label">Active Assets</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.under_maintenance_assets || 0}</div>
            <div class="stat-label">Under Maintenance</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">Rs ${stats.total_maintenance_cost || 0}</div>
            <div class="stat-label">Total Cost</div>
        </div>
    `;
}

function renderCharts(stats) {
    const container = document.getElementById('chartsContainer');
    container.innerHTML = `
        <div class="chart-card">
            <h3>Asset Status Distribution</h3>
            <canvas id="statusChart"></canvas>
        </div>
        <div class="chart-card">
            <h3>Maintenance Progress</h3>
            <canvas id="maintenanceChart"></canvas>
        </div>
    `;
    
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: stats.status_distribution?.map(s => s.status_label) || ['Active', 'Maintenance', 'Inactive'],
            datasets: [{
                data: stats.status_distribution?.map(s => s.count) || [0, 0, 0],
                backgroundColor: ['#10b981', '#f59e0b', '#6b7280']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
    
    loadMaintenanceChart();
}

async function loadMaintenanceChart() {
    try {
        const res = await authFetch(`${API_BASE}/maintenance`);
        const maintenance = await res.json();
        
        const scheduled = maintenance.filter(m => m.status === 'Scheduled').length;
        const inProgress = maintenance.filter(m => m.status === 'In Progress').length;
        const completed = maintenance.filter(m => m.status === 'Completed').length;
        
        const maintenanceCtx = document.getElementById('maintenanceChart').getContext('2d');
        new Chart(maintenanceCtx, {
            type: 'bar',
            data: {
                labels: ['Scheduled', 'In Progress', 'Completed'],
                datasets: [{
                    label: 'Maintenance Tasks',
                    data: [scheduled, inProgress, completed],
                    backgroundColor: ['#f59e0b', '#3b82f6', '#10b981']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    } catch (error) {
        console.error('Error loading maintenance chart:', error);
    }
}

async function loadAssets() {
    try {
        const res = await authFetch(`${API_BASE}/assets`);
        const assets = await res.json();
        
        markersLayer.clearLayers();
        regionsLayer.clearLayers();
        const heatmapData = [];
        
        assets.forEach(asset => {
            if (asset.location) {
                const coords = asset.location.coordinates;
                const marker = L.marker([coords[1], coords[0]], { icon: greenIcon }).bindPopup(`
                    <b>${asset.name}</b><br>
                    Type: ${asset.type}<br>
                    Status: ${asset.status}<br>
                    Department: ${asset.department || 'N/A'}
                `);
                marker.addTo(markersLayer);
                heatmapData.push([coords[1], coords[0], 1]);
                
                const circle = L.circle([coords[1], coords[0]], {
                    color: getStatusColor(asset.status),
                    fillColor: getStatusColor(asset.status),
                    fillOpacity: 0.2,
                    radius: 200
                });
                circle.addTo(regionsLayer);
            }
        });
        
        window.heatmapData = heatmapData;
        loadComplaintsOnMap();
    } catch (error) {
        console.error('Error loading assets:', error);
    }
}

function getStatusColor(status) {
    if (status === 'Active') return '#10b981';
    if (status === 'Maintenance') return '#f59e0b';
    return '#6b7280';
}

function toggleHeatmap() {
    if (showingHeatmap) {
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
        }
        markersLayer.addTo(map);
        regionsLayer.addTo(map);
        complaintsLayer.addTo(map);
        showingHeatmap = false;
    } else {
        if (window.heatmapData) {
            heatmapLayer = L.heatLayer(window.heatmapData, {
                radius: 25,
                blur: 15,
                maxZoom: 17
            }).addTo(map);
            map.removeLayer(markersLayer);
            map.removeLayer(regionsLayer);
            map.removeLayer(complaintsLayer);
            showingHeatmap = true;
        }
    }
}

async function loadComplaintsOnMap() {
    try {
        const res = await authFetch(`${API_BASE}/complaints`);
        const complaints = await res.json();
        
        complaintsLayer.clearLayers();
        
        complaints.forEach(complaint => {
            if (complaint.latitude && complaint.longitude) {
                const marker = L.marker([complaint.latitude, complaint.longitude], { icon: redIcon }).bindPopup(`
                    <b>${complaint.title}</b><br>
                    Type: ${complaint.asset_type}<br>
                    Status: ${complaint.status}<br>
                    Progress: ${complaint.progress}%
                `);
                marker.addTo(complaintsLayer);
            }
        });
    } catch (error) {
        console.error('Error loading complaints on map:', error);
    }
}

function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    
    document.getElementById(`${viewName}View`).classList.add('active');
    event.target.classList.add('active');
    
    if (viewName === 'map') {
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
    if (viewName === 'assets') loadAssetsTable();
    if (viewName === 'complaints') loadComplaints();
    if (viewName === 'maintenance') loadMaintenance();
    if (viewName === 'sla') loadSLA();
    if (viewName === 'analytics') loadAnalytics();
}

async function loadAssetsTable() {
    try {
        const res = await authFetch(`${API_BASE}/assets`);
        const assets = await res.json();
        
        let html = '<table><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Status</th><th>Department</th><th>Actions</th></tr></thead><tbody>';
        
        assets.forEach(asset => {
            html += `<tr>
                <td>${asset.id}</td>
                <td>${asset.name}</td>
                <td>${asset.type}</td>
                <td><span class="status-badge status-${asset.status.toLowerCase()}">${asset.status}</span></td>
                <td>${asset.department || 'N/A'}</td>
                <td>
                    ${currentUser.role !== 'Viewer' ? `
                        <button class="action-btn btn-edit" onclick="editAsset(${asset.id})">Edit</button>
                        <button class="action-btn btn-delete" onclick="deleteAsset(${asset.id})">Delete</button>
                    ` : 'View Only'}
                </td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        document.getElementById('assetsTable').innerHTML = html;
    } catch (error) {
        console.error('Error loading assets:', error);
    }
}

async function loadComplaints() {
    try {
        const res = await authFetch(`${API_BASE}/complaints`);
        const complaints = await res.json();
        
        let html = '<table><thead><tr><th>ID</th><th>Title</th><th>Asset Type</th><th>Status</th><th>Progress</th><th>Actions</th></tr></thead><tbody>';
        
        complaints.forEach(complaint => {
            html += `<tr>
                <td>${complaint.id}</td>
                <td>${complaint.title}</td>
                <td>${complaint.asset_type || 'N/A'}</td>
                <td><span class="status-badge">${complaint.status}</span></td>
                <td>
                    <div class="progress-bar" style="height: 20px; width: 100px;">
                        <div class="progress-fill" style="width: ${complaint.progress || 0}%; font-size: 11px;">${complaint.progress || 0}%</div>
                    </div>
                </td>
                <td>
                    <button class="action-btn btn-edit" onclick="viewComplaint(${complaint.id})">View</button>`;
            
            html += `</td></tr>`;
        });
        
        html += '</tbody></table>';
        document.getElementById('complaintsTable').innerHTML = html;
    } catch (error) {
        console.error('Error loading complaints:', error);
    }
}

function viewComplaint(id) {
    authFetch(`${API_BASE}/complaints/${id}`)
        .then(res => res.json())
        .then(complaint => {
            let html = `
                <div style="margin-bottom: 1rem;">
                    <strong>Title:</strong> ${complaint.title}<br>
                    <strong>Description:</strong> ${complaint.description}<br>
                    <strong>Asset Type:</strong> ${complaint.asset_type}<br>
                    <strong>Status:</strong> ${complaint.status}<br>
                    <strong>Progress:</strong> ${complaint.progress}%<br>
                    <strong>Location:</strong> ${complaint.latitude}, ${complaint.longitude}
                </div>`;
            
            if (complaint.status === 'Open' && (currentUser.role === 'Officer' || currentUser.role === 'Admin')) {
                html += `
                    <div class="form-group">
                        <label>Estimated Cost (Rs)</label>
                        <input type="number" id="estCost" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Assign Agency</label>
                        <input type="text" id="estAgency" class="form-control" required>
                    </div>
                    <button class="btn btn-primary" onclick="submitEstimate(${complaint.id})">Submit Estimate</button>
                `;
            }
            
            if (complaint.estimated_cost && currentUser.role === 'Officer') {
                html += `
                    <div style="margin-top: 1rem; padding: 1rem; background: #f7fafc; border-radius: 8px;">
                        <strong>Estimated Cost:</strong> Rs ${complaint.estimated_cost}<br>
                        <strong>Assigned Agency:</strong> ${complaint.assigned_agency}<br>
                        <em>Waiting for Admin approval</em>
                    </div>
                `;
            }
            
            if (complaint.estimated_cost && complaint.approval_status === 'Pending' && currentUser.role === 'Admin') {
                html += `
                    <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 8px;">
                        <strong>Officer Estimate:</strong> Rs ${complaint.estimated_cost}<br>
                        <strong>Recommended Agency:</strong> ${complaint.assigned_agency}
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label>Approved Cost (Rs)</label>
                        <input type="number" id="appCost" value="${complaint.estimated_cost}" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Confirm Agency</label>
                        <input type="text" id="appAgency" value="${complaint.assigned_agency}" class="form-control" required>
                    </div>
                    <button class="btn btn-primary" onclick="submitApproval(${complaint.id})">Approve</button>
                `;
            }
            
            if (complaint.approval_status === 'Approved' && currentUser.role === 'Admin') {
                html += `
                    <div style="margin-top: 1rem; padding: 1rem; background: #d1fae5; border-radius: 8px;">
                        <strong>Approved Cost:</strong> Rs ${complaint.approved_cost}<br>
                        <strong>Agency:</strong> ${complaint.assigned_agency}<br>
                        <strong>Status:</strong> ${complaint.status}
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label>Resolution Notes</label>
                        <textarea id="resNotes" class="form-control" rows="3" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>SLA Hours (for tracking)</label>
                        <input type="number" id="slaHours" class="form-control" value="24" min="1" required>
                        <small style="color: #6b7280;">Default: 24 hours. System will check if complaint was resolved within SLA.</small>
                    </div>
                    <button class="btn" style="background:#10b981;color:white;" onclick="submitClose(${complaint.id})">Close Complaint</button>
                `;
            }
            
            if ((currentUser.role === 'Officer' || currentUser.role === 'Admin') && complaint.approval_status === 'Approved') {
                html += `
                    <div class="form-group" style="margin-top: 1rem;">
                        <label>Update Progress (%)</label>
                        <input type="number" id="progValue" value="${complaint.progress}" min="0" max="100" class="form-control">
                    </div>
                    <button class="btn btn-secondary" onclick="submitProgress(${complaint.id})">Update Progress</button>
                `;
            }
            
            document.getElementById('complaintDetailContent').innerHTML = html;
            document.getElementById('complaintDetailModal').classList.add('show');
        });
}

function submitEstimate(id) {
    const cost = document.getElementById('estCost').value;
    const agency = document.getElementById('estAgency').value;
    
    if (!cost || !agency) {
        alert('Please fill all fields');
        return;
    }
    
    authFetch(`${API_BASE}/complaints/${id}/estimate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            estimated_cost: parseFloat(cost),
            assigned_agency: agency
        })
    }).then(res => {
        if (res.ok) {
            alert('Estimate submitted!');
            closeModal('complaintDetailModal');
            loadComplaints();
        } else {
            alert('Error submitting estimate');
        }
    });
}

function submitApproval(id) {
    const cost = document.getElementById('appCost').value;
    const agency = document.getElementById('appAgency').value;
    
    if (!cost || !agency) {
        alert('Please fill all fields');
        return;
    }
    
    authFetch(`${API_BASE}/complaints/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            approved_cost: parseFloat(cost),
            assigned_agency: agency
        })
    }).then(res => res.json()).then(data => {
        if (data.message) {
            alert(data.message);
            closeModal('complaintDetailModal');
            loadComplaints();
            loadDashboard();
        } else {
            alert('Error: ' + (data.error || 'Failed to approve'));
        }
    });
}

function submitClose(id) {
    const notes = document.getElementById('resNotes').value;
    const slaHours = document.getElementById('slaHours').value;
    
    if (!notes) {
        alert('Please add resolution notes');
        return;
    }
    
    authFetch(`${API_BASE}/complaints/${id}/close`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            resolution_notes: notes,
            sla_hours: parseInt(slaHours)
        })
    }).then(res => {
        if (res.ok) {
            alert('Complaint closed and SLA tracked!');
            closeModal('complaintDetailModal');
            loadComplaints();
            loadDashboard();
        } else {
            alert('Error closing complaint');
        }
    });
}

function submitProgress(id) {
    const progress = document.getElementById('progValue').value;
    
    authFetch(`${API_BASE}/complaints/${id}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: parseInt(progress) })
    }).then(res => {
        if (res.ok) {
            alert('Progress updated!');
            closeModal('complaintDetailModal');
            loadComplaints();
        } else {
            alert('Error updating progress');
        }
    });
}

async function loadMaintenance() {
    try {
        const res = await authFetch(`${API_BASE}/maintenance`);
        const maintenance = await res.json();
        
        const completed = maintenance.filter(m => m.status === 'Completed').length;
        const total = maintenance.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        let progressHTML = `<div class="progress-card"><h3>Overall Progress</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%">${percentage}%</div>
            </div>
            <p style="margin-top: 1rem;">${completed} of ${total} tasks completed</p>
        </div>`;
        
        document.getElementById('maintenanceProgress').innerHTML = progressHTML;
        
        let html = '<table><thead><tr><th>ID</th><th>Asset</th><th>Type</th><th>Status</th><th>Progress</th><th>Performed By</th><th>Cost</th></tr></thead><tbody>';
        
        maintenance.forEach(m => {
            const progress = m.status === 'Completed' ? 100 : m.status === 'In Progress' ? 50 : 0;
            html += `<tr>
                <td>${m.id}</td>
                <td>${m.asset_name || 'N/A'}</td>
                <td>${m.maintenance_type}</td>
                <td>${m.status}</td>
                <td>
                    <div class="progress-bar" style="height: 20px;">
                        <div class="progress-fill" style="width: ${progress}%; font-size: 11px;">${progress}%</div>
                    </div>
                </td>
                <td>${m.performed_by || 'N/A'}</td>
                <td>Rs ${m.cost || 0}</td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        document.getElementById('maintenanceTable').innerHTML = html;
    } catch (error) {
        console.error('Error loading maintenance:', error);
    }
}

async function loadSLA() {
    try {
        const res = await authFetch(`${API_BASE}/sla/breaches`);
        const breaches = await res.json();
        
        const statsHTML = `
            <div class="stats-grid">
                <div class="stat-card" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                    <div class="stat-value">${breaches.length}</div>
                    <div class="stat-label">Active Breaches</div>
                </div>
            </div>
        `;
        
        document.getElementById('slaStats').innerHTML = statsHTML;
        
        let html = '<table><thead><tr><th>ID</th><th>Asset ID</th><th>Reported</th><th>SLA Hours</th><th>Status</th></tr></thead><tbody>';
        
        breaches.forEach(breach => {
            html += `<tr>
                <td>${breach.id}</td>
                <td>${breach.asset_id || 'N/A'}</td>
                <td>${new Date(breach.issue_reported_at).toLocaleString()}</td>
                <td>${breach.sla_hours}</td>
                <td><span class="status-badge" style="background: #fed7d7; color: #742a2a;">${breach.status}</span></td>
            </tr>`;
        });
        
        html += '</tbody></table>';
        document.getElementById('slaTable').innerHTML = html;
    } catch (error) {
        console.error('Error loading SLA:', error);
    }
}

async function loadAnalytics() {
    const html = `
        <div class="chart-card">
            <h3>Asset Type Distribution</h3>
            <canvas id="assetTypeChart"></canvas>
        </div>
        <div class="chart-card">
            <h3>Complaints by Type</h3>
            <canvas id="complaintsChart"></canvas>
        </div>
        <div class="chart-card">
            <h3>Cost Analysis</h3>
            <canvas id="costChart"></canvas>
        </div>
    `;
    
    document.getElementById('analyticsGrid').innerHTML = html;
    
    setTimeout(async () => {
        try {
            const assetsRes = await authFetch(`${API_BASE}/assets`);
            const assets = await assetsRes.json();
            
            const typeCounts = {};
            assets.forEach(a => {
                typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
            });
            
            new Chart(document.getElementById('assetTypeChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: Object.keys(typeCounts),
                    datasets: [{
                        label: 'Count',
                        data: Object.values(typeCounts),
                        backgroundColor: '#667eea'
                    }]
                }
            });
            
            const complaintsRes = await authFetch(`${API_BASE}/complaints`);
            const complaints = await complaintsRes.json();
            
            const complaintTypes = {};
            complaints.forEach(c => {
                complaintTypes[c.asset_type] = (complaintTypes[c.asset_type] || 0) + 1;
            });
            
            new Chart(document.getElementById('complaintsChart').getContext('2d'), {
                type: 'pie',
                data: {
                    labels: Object.keys(complaintTypes),
                    datasets: [{
                        data: Object.values(complaintTypes),
                        backgroundColor: ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6']
                    }]
                }
            });
            
            const maintenanceRes = await authFetch(`${API_BASE}/maintenance`);
            const maintenance = await maintenanceRes.json();
            
            const totalCost = maintenance.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0);
            const avgCost = maintenance.length > 0 ? totalCost / maintenance.length : 0;
            
            new Chart(document.getElementById('costChart').getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Total Cost', 'Average Cost'],
                    datasets: [{
                        data: [totalCost, avgCost],
                        backgroundColor: ['#667eea', '#10b981']
                    }]
                }
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }, 100);
}

function showAddAssetModal() {
    document.getElementById('assetModal').classList.add('show');
}

function showAddComplaintModal() {
    document.getElementById('complaintModal').classList.add('show');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    if (modalId === 'assetModal') {
        delete modal.dataset.editId;
        document.getElementById('assetForm').reset();
    }
}

function useCurrentLocation(type) {
    if (userLocation) {
        if (type === 'asset') {
            document.getElementById('assetLat').value = userLocation.lat;
            document.getElementById('assetLng').value = userLocation.lng;
        } else {
            document.getElementById('complaintLat').value = userLocation.lat;
            document.getElementById('complaintLng').value = userLocation.lng;
        }
    } else {
        alert('Location not available. Please enable location access.');
    }
}

document.getElementById('assetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const modal = document.getElementById('assetModal');
    const editId = modal.dataset.editId;
    
    const data = {
        name: document.getElementById('assetName').value,
        type: document.getElementById('assetType').value,
        department: document.getElementById('assetDept').value,
        status: 'Active',
        location: {
            type: 'Point',
            coordinates: [
                parseFloat(document.getElementById('assetLng').value),
                parseFloat(document.getElementById('assetLat').value)
            ]
        }
    };
    
    try {
        const url = editId ? `${API_BASE}/assets/${editId}` : `${API_BASE}/assets`;
        const method = editId ? 'PUT' : 'POST';
        
        const res = await authFetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            alert(editId ? 'Asset updated successfully!' : 'Asset added successfully!');
            closeModal('assetModal');
            document.getElementById('assetForm').reset();
            delete modal.dataset.editId;
            loadAssets();
            loadAssetsTable();
            loadDashboard();
        } else {
            const error = await res.json();
            alert('Error: ' + (error.message || 'Failed to save asset'));
        }
    } catch (error) {
        alert('Error saving asset');
    }
});

document.getElementById('complaintForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        title: document.getElementById('complaintTitle').value,
        description: document.getElementById('complaintDesc').value,
        asset_type: document.getElementById('complaintAssetType').value,
        latitude: parseFloat(document.getElementById('complaintLat').value),
        longitude: parseFloat(document.getElementById('complaintLng').value)
    };
    
    try {
        const res = await authFetch(`${API_BASE}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            const result = await res.json();
            alert(`Complaint submitted successfully! Assigned to: ${result.assigned_agency}`);
            closeModal('complaintModal');
            document.getElementById('complaintForm').reset();
            loadComplaints();
            loadDashboard();
        } else {
            const error = await res.json();
            alert('Error: ' + (error.error || 'Failed to submit complaint'));
        }
    } catch (error) {
        console.error('Error submitting complaint:', error);
        alert('Error submitting complaint. Please try again.');
    }
});

async function deleteAsset(id) {
    if (confirm('Are you sure you want to delete this asset?')) {
        try {
            const res = await authFetch(`${API_BASE}/assets/${id}`, {
                method: 'DELETE'
            });
            
            if (res.ok) {
                alert('Asset deleted successfully!');
                loadAssets();
                loadAssetsTable();
                loadDashboard();
            }
        } catch (error) {
            alert('Error deleting asset');
        }
    }
}

async function editAsset(id) {
    try {
        console.log('Editing asset ID:', id);
        const res = await authFetch(`${API_BASE}/assets/${id}`);
        console.log('Response status:', res.status);
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to fetch asset: ${res.status}`);
        }
        
        const asset = await res.json();
        console.log('Asset data:', asset);
        
        const modal = document.getElementById('assetModal');
        document.getElementById('assetName').value = asset.name || '';
        document.getElementById('assetType').value = asset.type || '';
        document.getElementById('assetDept').value = asset.department || '';
        
        if (asset.location && asset.location.coordinates) {
            document.getElementById('assetLng').value = asset.location.coordinates[0];
            document.getElementById('assetLat').value = asset.location.coordinates[1];
        } else {
            console.warn('No location data found');
        }
        
        modal.classList.add('show');
        modal.dataset.editId = id;
    } catch (error) {
        console.error('Edit asset error:', error);
        alert('Error loading asset details: ' + error.message);
    }
}

setInterval(() => {
    if (document.getElementById('dashboardView').classList.contains('active')) {
        loadDashboard();
    }
    if (document.getElementById('complaintsView').classList.contains('active')) {
        loadComplaints();
    }
    if (document.getElementById('maintenanceView').classList.contains('active')) {
        loadMaintenance();
    }
}, 30000);

function exportData(type, format) {
    const url = `${API_BASE}/export/${type}/${format}`;
    authFetch(url)
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_export.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Export error:', error);
            alert('Error exporting data');
        });
}
