// Advanced Features JavaScript

const API_URL = 'http://localhost:5000/api';

let currentAdvancedTab = 'intelligence';

function renderIntelligenceTab() {
    return `
        <div class="advanced-section">
            <h3>InfraBrain AI - All 16 Modules</h3>
            
            <div class="intelligence-grid">
                <div class="intel-card" style="cursor: pointer;" onclick="loadHealthScoring()">
                    <h4>Module 4: Health Scoring</h4>
                    <p>Calculate 0-100 health scores for assets</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadRiskPrediction()">
                    <h4>Module 5: Risk Prediction</h4>
                    <p>3/6/12 month failure predictions</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadCriticalityIndex()">
                    <h4>Module 6: Criticality Index</h4>
                    <p>Risk x Population x Economic x Service</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadPriorityRanking()">
                    <h4>Module 7: Priority Ranking</h4>
                    <p>Auto-ranked urgent repair list</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadBudgetSimulation()">
                    <h4>Module 8: Budget Simulation</h4>
                    <p>What-if scenario analysis</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadFraudDetection()">
                    <h4>Module 12: Fraud Detection</h4>
                    <p>AI-powered anomaly detection</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadRootCause()">
                    <h4>Module 13: Root Cause Analysis</h4>
                    <p>Automated failure investigation</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadClimateRisk()">
                    <h4>Module 14: Climate Risk</h4>
                    <p>Flood/heat/environmental assessment</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadEmergencyResponse()">
                    <h4>Module 15: Emergency Response</h4>
                    <p>Optimized contractor dispatch</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadEquityAnalysis()">
                    <h4>Module 16: Equity Analysis</h4>
                    <p>District-level fairness metrics</p>
                </div>
                
                <div class="intel-card" style="cursor: pointer;" onclick="loadComprehensiveDashboard()">
                    <h4>Unified Dashboard</h4>
                    <p>All metrics in one view</p>
                </div>
            </div>
            
            <div id="intelligenceResult" style="margin-top: 2rem;"></div>
        </div>
    `;
}

function showAdvancedTab(tab) {
    currentAdvancedTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const content = document.getElementById('advancedContent');
    
    switch(tab) {
        case 'intelligence':
            content.innerHTML = renderIntelligenceTab();
            setTimeout(() => loadAdvancedAssetDropdowns(), 200);
            break;
        case 'ml':
            content.innerHTML = renderMLTab();
            setTimeout(() => loadAdvancedAssetDropdowns(), 200);
            break;
        case 'blockchain':
            content.innerHTML = renderBlockchainTab();
            setTimeout(() => loadAdvancedAssetDropdowns(), 200);
            break;
        case 'climate':
            content.innerHTML = renderClimateTab();
            setTimeout(() => loadAdvancedAssetDropdowns(), 200);
            break;
        case 'simulation':
            content.innerHTML = renderSimulationTab();
            break;
        case 'optimization':
            content.innerHTML = renderOptimizationTab();
            break;
    }
}

function renderMLTab() {
    return `
        <div class="advanced-section">
            <h3>ML Predictions & Forecasting</h3>
            <div class="form-group">
                <label>Select Asset for Failure Prediction</label>
                <select id="mlAssetSelect" onchange="predictAssetFailure()">
                    <option value="">Select Asset</option>
                </select>
            </div>
            <div id="mlPredictionResult"></div>
            
            <div style="margin-top: 2rem;">
                <button class="btn btn-primary" onclick="forecastMaintenance()">Forecast Maintenance Needs</button>
                <div id="mlForecastResult"></div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h4>Budget Optimization</h4>
                <input type="number" id="totalBudget" placeholder="Total Budget (Rs)" style="padding: 0.5rem; width: 200px;">
                <button class="btn btn-primary" onclick="optimizeBudgetML()">Optimize</button>
                <div id="mlBudgetResult"></div>
            </div>
        </div>
    `;
}

function renderBlockchainTab() {
    return `
        <div class="advanced-section">
            <h3>Smart Contract Escrow</h3>
            <div id="blockchainContracts"></div>
            <div style="margin-top: 2rem;">
                <h4>Create New Contract</h4>
                <select id="bcComplaintSelect">
                    <option value="">Select Complaint</option>
                </select>
                <input type="text" id="bcContractor" placeholder="Contractor Address" style="padding: 0.5rem; margin: 0.5rem;">
                <input type="number" id="bcAmount" placeholder="Escrow Amount" style="padding: 0.5rem;">
                <button class="btn btn-primary" onclick="createBlockchainContract()">Create Contract</button>
            </div>
        </div>
    `;
}

function renderClimateTab() {
    return `
        <div class="advanced-section">
            <h3>Climate Risk Assessment</h3>
            <div class="form-group">
                <label>Select Asset for Climate Assessment</label>
                <select id="climateAssetSelect" onchange="assessClimateRisk()">
                    <option value="">Select Asset</option>
                </select>
            </div>
            <div id="climateResult"></div>
        </div>
    `;
}

function renderSimulationTab() {
    return `
        <div class="advanced-section">
            <h3>Scenario Simulations</h3>
            
            <div class="sim-card">
                <h4>Budget Change Simulation</h4>
                <input type="number" id="budgetChange" placeholder="Budget Change (%)" style="padding: 0.5rem;">
                <button class="btn btn-primary" onclick="simulateBudgetChange()">Simulate</button>
                <div id="budgetSimResult"></div>
            </div>
            
            <div class="sim-card">
                <h4>Maintenance Strategy Simulation</h4>
                <select id="strategySelect">
                    <option value="Preventive">Preventive</option>
                    <option value="Reactive">Reactive</option>
                    <option value="Predictive">Predictive</option>
                </select>
                <button class="btn btn-primary" onclick="simulateStrategy()">Simulate</button>
                <div id="strategySimResult"></div>
            </div>
            
            <div class="sim-card">
                <h4>Cascading Failure Simulation</h4>
                <select id="cascadeAssetType">
                    <option value="Road">Road</option>
                    <option value="Bridge">Bridge</option>
                    <option value="Water Pipeline">Water Pipeline</option>
                    <option value="Sewage">Sewage</option>
                    <option value="Electricity">Electricity</option>
                </select>
                <button class="btn btn-primary" onclick="simulateCascade()">Simulate</button>
                <div id="cascadeSimResult"></div>
            </div>
        </div>
    `;
}

function renderOptimizationTab() {
    return `
        <div class="advanced-section">
            <h3>Resource Optimization</h3>
            
            <div class="opt-card">
                <h4>Contractor Assignment Optimization</h4>
                <button class="btn btn-primary" onclick="optimizeContractor()">Find Best Contractor</button>
                <div id="contractorOptResult"></div>
            </div>
            
            <div class="opt-card">
                <h4>Workforce Routing Optimization</h4>
                <button class="btn btn-primary" onclick="optimizeRouting()">Optimize Routes</button>
                <div id="routingOptResult"></div>
            </div>
            
            <div class="opt-card">
                <h4>Emergency Response Optimization</h4>
                <button class="btn btn-primary" onclick="optimizeEmergency()">Optimize Response</button>
                <div id="emergencyOptResult"></div>
            </div>
        </div>
    `;
}

function renderIoTTab() {
    return `
        <div class="advanced-section">
            <h3>🔐 IoT Security & Public Verification</h3>
            
            <div class="iot-card">
                <h4>Register IoT Device</h4>
                <select id="iotAssetSelect">
                    <option value="">Select Asset</option>
                </select>
                <select id="iotDeviceType">
                    <option value="Vibration">Vibration Sensor</option>
                    <option value="Temperature">Temperature Sensor</option>
                    <option value="Pressure">Pressure Sensor</option>
                    <option value="Flow">Flow Sensor</option>
                </select>
                <button class="btn btn-primary" onclick="registerIoTDevice()">Register</button>
                <div id="iotRegResult"></div>
            </div>
            
            <div class="iot-card">
                <h4>Generate QR Verification</h4>
                <select id="qrComplaintSelect">
                    <option value="">Select Complaint</option>
                </select>
                <button class="btn btn-primary" onclick="generateQRCode()">Generate QR</button>
                <div id="qrResult"></div>
            </div>
        </div>
    `;
}

// API Calls
async function predictAssetFailure() {
    const assetId = document.getElementById('mlAssetSelect').value;
    if (!assetId) return;
    
    try {
        const response = await fetch(`${API_URL}/advanced/ml/predict/${assetId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        document.getElementById('mlPredictionResult').innerHTML = `
            <div class="result-card">
                <h4>Prediction Results</h4>
                <p><strong>Failure Probability:</strong> ${(data.failureProbability * 100).toFixed(2)}%</p>
                <p><strong>Predicted Failure Date:</strong> ${new Date(data.predictedFailureDate).toLocaleDateString()}</p>
                <p><strong>Confidence Score:</strong> ${(data.confidenceScore * 100).toFixed(2)}%</p>
                <p><strong>Recommended Action:</strong> ${data.recommendedAction}</p>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function forecastMaintenance() {
    try {
        const response = await fetch(`${API_URL}/advanced/ml/forecast`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        let html = '<div class="result-card"><h4>Maintenance Forecast</h4><table class="data-table"><tr><th>Asset Type</th><th>Predicted Cost</th><th>Frequency</th><th>Priority</th></tr>';
        data.forEach(item => {
            html += `<tr><td>${item.assetType}</td><td>Rs ${item.predictedCost}</td><td>${item.frequency}/year</td><td><span class="badge badge-${item.priority.toLowerCase()}">${item.priority}</span></td></tr>`;
        });
        html += '</table></div>';
        
        document.getElementById('mlForecastResult').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function optimizeBudgetML() {
    const totalBudget = document.getElementById('totalBudget').value;
    if (!totalBudget) return alert('Enter total budget');
    
    try {
        const response = await fetch(`${API_URL}/advanced/ml/budget-optimize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ totalBudget: parseFloat(totalBudget) })
        });
        const data = await response.json();
        
        let html = '<div class="result-card"><h4>Optimized Budget Allocation</h4><table class="data-table"><tr><th>Department</th><th>Asset Type</th><th>Recommended Amount</th><th>Efficiency</th></tr>';
        data.forEach(item => {
            html += `<tr><td>${item.department}</td><td>${item.assetType}</td><td>Rs ${item.recommendedAmount.toLocaleString()}</td><td>${item.efficiency}</td></tr>`;
        });
        html += '</table></div>';
        
        document.getElementById('mlBudgetResult').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadBlockchainData() {
    // Load complaints for dropdown
    const response = await fetch(`${API_URL}/complaints`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const complaints = await response.json();
    
    const select = document.getElementById('bcComplaintSelect');
    complaints.forEach(c => {
        select.innerHTML += `<option value="${c.id}">${c.title}</option>`;
    });
}

async function createBlockchainContract() {
    const complaintId = document.getElementById('bcComplaintSelect').value;
    const contractorAddress = document.getElementById('bcContractor').value;
    const escrowAmount = document.getElementById('bcAmount').value;
    
    if (!complaintId || !contractorAddress || !escrowAmount) {
        return alert('Fill all fields');
    }
    
    try {
        const response = await fetch(`${API_URL}/advanced/blockchain/contract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ complaintId, contractorAddress, escrowAmount: parseFloat(escrowAmount) })
        });
        const data = await response.json();
        
        alert(`Contract created! Hash: ${data.contract_hash}`);
        showAdvancedTab('blockchain');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function assessClimateRisk() {
    const assetId = document.getElementById('climateAssetSelect').value;
    if (!assetId) return;
    
    try {
        const response = await fetch(`${API_URL}/advanced/climate/assess/${assetId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        document.getElementById('climateResult').innerHTML = `
            <div class="result-card">
                <h4>Climate Risk Assessment</h4>
                <div class="risk-grid">
                    <div class="risk-item">
                        <span>Flood Risk:</span>
                        <div class="progress-bar"><div class="progress" style="width: ${data.flood_risk * 100}%"></div></div>
                        <span>${(data.flood_risk * 100).toFixed(1)}%</span>
                    </div>
                    <div class="risk-item">
                        <span>Heat Vulnerability:</span>
                        <div class="progress-bar"><div class="progress" style="width: ${data.heat_vulnerability * 100}%"></div></div>
                        <span>${(data.heat_vulnerability * 100).toFixed(1)}%</span>
                    </div>
                    <div class="risk-item">
                        <span>Environmental Impact:</span>
                        <div class="progress-bar"><div class="progress" style="width: ${data.environmental_impact * 100}%"></div></div>
                        <span>${(data.environmental_impact * 100).toFixed(1)}%</span>
                    </div>
                    <div class="risk-item">
                        <span>Resilience Score:</span>
                        <div class="progress-bar"><div class="progress" style="width: ${data.resilience_score * 100}%; background: #10b981;"></div></div>
                        <span>${(data.resilience_score * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function simulateBudgetChange() {
    const budgetChange = document.getElementById('budgetChange').value;
    if (!budgetChange) return alert('Enter budget change percentage');
    
    try {
        const response = await fetch(`${API_URL}/advanced/simulate/budget`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ budgetChange: parseFloat(budgetChange) })
        });
        const data = await response.json();
        
        let html = '<div class="result-card"><h4>Budget Impact Analysis</h4><table class="data-table"><tr><th>Asset Type</th><th>Current</th><th>Projected</th><th>Impact</th></tr>';
        data.impact.forEach(item => {
            html += `<tr><td>${item.assetType}</td><td>Rs ${item.currentMaintenance.toLocaleString()}</td><td>Rs ${item.projectedMaintenance.toLocaleString()}</td><td><span class="badge badge-${item.impactLevel.toLowerCase()}">${item.impactLevel}</span></td></tr>`;
        });
        html += '</table></div>';
        
        document.getElementById('budgetSimResult').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function simulateStrategy() {
    const strategy = document.getElementById('strategySelect').value;
    
    try {
        const response = await fetch(`${API_URL}/advanced/simulate/strategy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ strategy })
        });
        const data = await response.json();
        
        document.getElementById('strategySimResult').innerHTML = `
            <div class="result-card">
                <h4>${strategy} Strategy Impact</h4>
                <p><strong>Cost Multiplier:</strong> ${data.impact.costMultiplier}x</p>
                <p><strong>Failure Reduction:</strong> ${(data.impact.failureReduction * 100).toFixed(0)}%</p>
                <p><strong>Resilience Gain:</strong> ${(data.impact.resilienceGain * 100).toFixed(0)}%</p>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function simulateCascade() {
    const assetType = document.getElementById('cascadeAssetType').value;
    
    try {
        const response = await fetch(`${API_URL}/advanced/simulate/cascade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ assetType })
        });
        const data = await response.json();
        
        let html = '<div class="result-card"><h4>Cascading Failure Analysis</h4><table class="data-table"><tr><th>Affected Asset</th><th>Probability</th><th>Time to Impact</th><th>Severity</th></tr>';
        data.forEach(item => {
            html += `<tr><td>${item.affectedAsset}</td><td>${(item.probability * 100).toFixed(0)}%</td><td>${item.timeToImpact}</td><td><span class="badge badge-${item.severity.toLowerCase()}">${item.severity}</span></td></tr>`;
        });
        html += '</table></div>';
        
        document.getElementById('cascadeSimResult').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function optimizeContractor() {
    try {
        const response = await fetch(`${API_URL}/advanced/optimize/contractor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ complaintType: 'Road', location: {} })
        });
        const data = await response.json();
        
        let html = '<div class="result-card"><h4>Contractor Rankings</h4><table class="data-table"><tr><th>Rank</th><th>Contractor</th><th>Score</th><th>Est. Time</th><th>Recommendation</th></tr>';
        data.forEach(item => {
            html += `<tr><td>${item.rank}</td><td>${item.contractor}</td><td>${item.score}</td><td>${item.estimatedTime}</td><td><span class="badge badge-${item.recommendation === 'Best Choice' ? 'success' : 'info'}">${item.recommendation}</span></td></tr>`;
        });
        html += '</table></div>';
        
        document.getElementById('contractorOptResult').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function optimizeRouting() {
    try {
        const response = await fetch(`${API_URL}/advanced/optimize/routing`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        let html = '<div class="result-card"><h4>Optimized Routes</h4><table class="data-table"><tr><th>Sequence</th><th>Complaint ID</th><th>Location</th><th>Est. Time</th></tr>';
        data.forEach(item => {
            html += `<tr><td>${item.sequence}</td><td>#${item.complaintId}</td><td>${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}</td><td>${item.estimatedTime}</td></tr>`;
        });
        html += '</table></div>';
        
        document.getElementById('routingOptResult').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function optimizeEmergency() {
    try {
        const response = await fetch(`${API_URL}/advanced/optimize/emergency`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ emergencyType: 'Fire', location: { latitude: 9.9252, longitude: 78.1198 } })
        });
        const data = await response.json();
        
        let html = '<div class="result-card"><h4>Emergency Response Plan</h4><table class="data-table"><tr><th>Priority</th><th>Asset</th><th>Distance</th><th>Response Time</th></tr>';
        data.forEach(item => {
            html += `<tr><td>${item.priority}</td><td>${item.assetName}</td><td>${item.distance}</td><td>${item.responseTime}</td></tr>`;
        });
        html += '</table></div>';
        
        document.getElementById('emergencyOptResult').innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function registerIoTDevice() {
    const assetId = document.getElementById('iotAssetSelect').value;
    const deviceType = document.getElementById('iotDeviceType').value;
    
    if (!assetId) return alert('Select an asset');
    
    try {
        const response = await fetch(`${API_URL}/advanced/iot/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ assetId: parseInt(assetId), deviceType })
        });
        const data = await response.json();
        
        document.getElementById('iotRegResult').innerHTML = `
            <div class="result-card">
                <h4>Device Registered</h4>
                <p><strong>Device ID:</strong> ${data.device_id}</p>
                <p><strong>Type:</strong> ${data.device_type}</p>
                <p><strong>Status:</strong> <span class="badge badge-success">${data.status}</span></p>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function generateQRCode() {
    const complaintId = document.getElementById('qrComplaintSelect').value;
    if (!complaintId) return alert('Select a complaint');
    
    try {
        const response = await fetch(`${API_URL}/advanced/verify/qr/${complaintId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        document.getElementById('qrResult').innerHTML = `
            <div class="result-card">
                <h4>QR Code Generated</h4>
                <p><strong>QR Code:</strong> ${data.qr_code}</p>
                <p><strong>Public Verification URL:</strong></p>
                <code>https://portal.example.com/verify/${data.qr_code}</code>
                <p style="margin-top: 1rem;"><em>Citizens can scan this QR to verify complaint status, contractor details, and blockchain proof</em></p>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Load asset dropdowns
async function loadAdvancedAssetDropdowns() {
    try {
        const response = await fetch(`${API_URL}/assets`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const assets = await response.json();
        
        console.log('Loaded assets:', assets);
        
        const mlSelect = document.getElementById('mlAssetSelect');
        const climateSelect = document.getElementById('climateAssetSelect');
        
        if (mlSelect) {
            mlSelect.innerHTML = '<option value="">Select Asset</option>';
            if (assets && assets.length > 0) {
                assets.forEach(asset => {
                    mlSelect.innerHTML += `<option value="${asset.id}">${asset.name} (${asset.type})</option>`;
                });
            } else {
                mlSelect.innerHTML += '<option value="">No assets available - Create assets first</option>';
            }
        }
        
        if (climateSelect) {
            climateSelect.innerHTML = '<option value="">Select Asset</option>';
            if (assets && assets.length > 0) {
                assets.forEach(asset => {
                    climateSelect.innerHTML += `<option value="${asset.id}">${asset.name} (${asset.type})</option>`;
                });
            } else {
                climateSelect.innerHTML += '<option value="">No assets available - Create assets first</option>';
            }
        }
        
        const response2 = await fetch(`${API_URL}/complaints`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const complaints = await response2.json();
        
        console.log('Loaded complaints:', complaints);
        
        const bcSelect = document.getElementById('bcComplaintSelect');
        if (bcSelect) {
            bcSelect.innerHTML = '<option value="">Select Complaint</option>';
            if (complaints && complaints.length > 0) {
                complaints.forEach(c => {
                    bcSelect.innerHTML += `<option value="${c.id}">${c.title}</option>`;
                });
            } else {
                bcSelect.innerHTML += '<option value="">No complaints available</option>';
            }
        }
    } catch (error) {
        console.error('Error loading dropdowns:', error);
        alert('Error loading data. Please ensure assets and complaints exist.');
    }
}

// Initialize when advanced view is shown
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const advView = document.getElementById('advancedView');
        if (advView) {
            // Load dropdowns when advanced view becomes active
            const observer = new MutationObserver(() => {
                if (advView.classList.contains('active')) {
                    console.log('Advanced view activated, loading dropdowns...');
                    loadAdvancedAssetDropdowns();
                }
            });
            observer.observe(advView, { attributes: true, attributeFilter: ['class'] });
            
            // Also load immediately if already active
            if (advView.classList.contains('active')) {
                loadAdvancedAssetDropdowns();
            }
        }
    }, 1000);
});


// ========================================
// INFRABRAIN AI INTELLIGENCE MODULES
// ========================================

async function loadHealthScoring() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = '<div class="loading">Loading health scores...</div>';
    
    try {
        const response = await fetch(`${API_URL}/intelligence/health-dashboard`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        console.log('Health scoring response:', data);
        
        if (data.success) {
            let html = '<div class="result-card"><h3>Infrastructure Health Scoring</h3>';
            html += `<p><strong>Average Score:</strong> ${data.data.averageScore}/100</p>`;
            html += '<table class="data-table"><tr><th>Status</th><th>Count</th></tr>';
            html += `<tr><td>Good (76-100)</td><td>${data.data.good}</td></tr>`;
            html += `<tr><td>Moderate (51-75)</td><td>${data.data.moderate}</td></tr>`;
            html += `<tr><td>Critical (0-50)</td><td>${data.data.critical}</td></tr>`;
            html += '</table></div>';
            result.innerHTML = html;
        } else {
            result.innerHTML = '<div class="error">No data available</div>';
        }
    } catch (error) {
        console.error('Health scoring error:', error);
        result.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
    }
}

async function loadRiskPrediction() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = '<div class=\"loading\">Loading risk predictions...</div>';
    
    try {
        const response = await fetch(`${API_URL}/intelligence/risk-metrics`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div class=\"result-card\"><h3>Risk Prediction Engine</h3>';
            html += `<p><strong>Average Risk:</strong> ${(data.data.averageRisk * 100).toFixed(1)}%</p>`;
            html += '<table class=\"data-table\"><tr><th>Risk Level</th><th>Assets</th></tr>';
            html += `<tr><td>High Risk</td><td>${data.data.distribution.high}</td></tr>`;
            html += `<tr><td>Medium Risk</td><td>${data.data.distribution.medium}</td></tr>`;
            html += `<tr><td>Low Risk</td><td>${data.data.distribution.low}</td></tr>`;
            html += '</table></div>';
            result.innerHTML = html;
        }
    } catch (error) {
        result.innerHTML = '<div class=\"error\">Error loading risk predictions</div>';
    }
}

async function loadCriticalityIndex() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = '<div class=\"loading\">Loading criticality index...</div>';
    
    try {
        const response = await fetch(`${API_URL}/intelligence/criticality-leaderboard`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div class=\"result-card\"><h3>Infrastructure Criticality Index</h3>';
            html += '<table class=\"data-table\"><tr><th>Rank</th><th>Asset</th><th>Score</th><th>Status</th></tr>';
            data.data.leaderboard.slice(0, 10).forEach((item, index) => {
                html += `<tr><td>${index + 1}</td><td>${item.name}</td><td>${item.criticalityScore.toFixed(1)}</td><td><span class=\"badge badge-${item.rank.toLowerCase()}\">${item.rank}</span></td></tr>`;
            });
            html += '</table></div>';
            result.innerHTML = html;
        }
    } catch (error) {
        result.innerHTML = '<div class=\"error\">Error loading criticality index</div>';
    }
}

async function loadPriorityRanking() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = '<div class=\"loading\">Loading priority ranking...</div>';
    
    try {
        const response = await fetch(`${API_URL}/intelligence/priority-ranking`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div class=\"result-card\"><h3>Smart Priority Ranking</h3>';
            html += `<p><strong>Urgent:</strong> ${data.data.summary.urgent} | <strong>Planned:</strong> ${data.data.summary.planned} | <strong>Preventative:</strong> ${data.data.summary.preventative}</p>`;
            html += '<table class=\"data-table\"><tr><th>Priority</th><th>Asset</th><th>Score</th><th>Urgency</th></tr>';
            data.data.ranking.slice(0, 10).forEach(item => {
                html += `<tr><td>${item.priorityScore}</td><td>${item.name}</td><td>${item.priorityScore}</td><td><span class=\"badge badge-${item.urgency.toLowerCase()}\">${item.urgency}</span></td></tr>`;
            });
            html += '</table></div>';
            result.innerHTML = html;
        }
    } catch (error) {
        result.innerHTML = '<div class=\"error\">Error loading priority ranking</div>';
    }
}

async function loadBudgetSimulation() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = `
        <div class=\"result-card\">
            <h3>Budget Simulation Engine</h3>
            <div class=\"form-group\">
                <label>Budget Change (%)</label>
                <input type=\"number\" id=\"budgetChangePercent\" value=\"20\" style=\"padding: 0.5rem;\">
            </div>
            <div class=\"form-group\">
                <label>Maintenance Frequency</label>
                <select id=\"maintenanceFreq\" style=\"padding: 0.5rem;\">
                    <option value=\"increased\">Increased</option>
                    <option value=\"decreased\">Decreased</option>
                    <option value=\"same\">Same</option>
                </select>
            </div>
            <button class=\"btn btn-primary\" onclick=\"runBudgetSimulation()\">Run Simulation</button>
            <div id=\"budgetSimResult\"></div>
        </div>
    `;
}

async function runBudgetSimulation() {
    const budgetChange = document.getElementById('budgetChangePercent').value;
    const maintenanceFreq = document.getElementById('maintenanceFreq').value;
    
    try {
        const response = await fetch(`${API_URL}/intelligence/budget-simulation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                scenario: {
                    budgetChange: parseFloat(budgetChange),
                    maintenanceFrequency: maintenanceFreq,
                    timeframe: 12
                }
            })
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div style=\"margin-top: 1rem;\"><h4>Simulation Results</h4>';
            html += '<table class=\"data-table\"><tr><th>Metric</th><th>Before</th><th>After</th></tr>';
            html += `<tr><td>Total Budget</td><td>Rs ${data.data.before.totalBudget.toLocaleString()}</td><td>Rs ${data.data.after.totalBudget.toLocaleString()}</td></tr>`;
            html += `<tr><td>Risk Reduction</td><td>${data.data.before.riskReduction}%</td><td>${data.data.after.riskReduction}%</td></tr>`;
            html += `<tr><td>Assets at Risk</td><td>${data.data.before.assetsAtRisk}</td><td>${data.data.after.assetsAtRisk}</td></tr>`;
            html += '</table>';
            html += `<p><strong>Cost-Benefit Ratio:</strong> ${data.data.impact.costBenefit}</p>`;
            html += `<p><strong>Recommendation:</strong> ${data.data.impact.recommendation}</p></div>`;
            document.getElementById('budgetSimResult').innerHTML = html;
        }
    } catch (error) {
        document.getElementById('budgetSimResult').innerHTML = '<div class=\"error\">Error running simulation</div>';
    }
}

async function loadFraudDetection() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = '<div class=\"loading\">Detecting fraud patterns...</div>';
    
    try {
        const response = await fetch(`${API_URL}/intelligence/fraud-detection`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div class=\"result-card\"><h3>AI Fraud & Anomaly Detection</h3>';
            html += `<p><strong>Total Alerts:</strong> ${data.data.summary.totalAlerts} | <strong>Critical:</strong> ${data.data.summary.critical} | <strong>Estimated Risk:</strong> Rs ${data.data.summary.estimatedFraudRisk.toLocaleString()}</p>`;
            html += '<table class=\"data-table\"><tr><th>Type</th><th>Severity</th><th>Description</th><th>Amount</th></tr>';
            data.data.alerts.forEach(alert => {
                html += `<tr><td>${alert.type}</td><td><span class=\"badge badge-${alert.severity.toLowerCase()}\">${alert.severity}</span></td><td>${alert.description}</td><td>Rs ${alert.amount.toLocaleString()}</td></tr>`;
            });
            html += '</table></div>';
            result.innerHTML = html;
        }
    } catch (error) {
        result.innerHTML = '<div class=\"error\">Error detecting fraud</div>';
    }
}

async function loadRootCause() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = `
        <div class=\"result-card\">
            <h3>Root Cause Analysis Engine</h3>
            <div class=\"form-group\">
                <label>Select Asset</label>
                <select id=\"rootCauseAsset\" style=\"padding: 0.5rem;\">
                    <option value=\"\">Select Asset</option>
                </select>
            </div>
            <div class=\"form-group\">
                <label>Failure Date</label>
                <input type=\"date\" id=\"failureDate\" style=\"padding: 0.5rem;\">
            </div>
            <button class=\"btn btn-primary\" onclick=\"analyzeRootCause()\">Analyze</button>
            <div id=\"rootCauseResult\"></div>
        </div>
    `;
    loadAdvancedAssetDropdowns();
}

async function analyzeRootCause() {
    const assetId = document.getElementById('rootCauseAsset').value;
    const failureDate = document.getElementById('failureDate').value;
    
    if (!assetId || !failureDate) return alert('Select asset and date');
    
    try {
        const response = await fetch(`${API_URL}/intelligence/root-cause-analysis`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ assetId: parseInt(assetId), failureDate })
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div style=\"margin-top: 1rem;\"><h4>Root Cause Analysis</h4>';
            html += `<p><strong>Failure Type:</strong> ${data.data.failureType}</p>`;
            html += '<table class=\"data-table\"><tr><th>Cause</th><th>Contribution</th><th>Evidence</th></tr>';
            data.data.rootCauses.forEach(cause => {
                html += `<tr><td>${cause.cause}</td><td>${cause.contribution}%</td><td>${cause.evidence}</td></tr>`;
            });
            html += '</table>';
            html += '<h4>Recommendations:</h4><ul>';
            data.data.recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += '</ul></div>';
            document.getElementById('rootCauseResult').innerHTML = html;
        }
    } catch (error) {
        document.getElementById('rootCauseResult').innerHTML = '<div class=\"error\">Error analyzing root cause</div>';
    }
}

async function loadClimateRisk() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = '<div class=\"loading\">Loading climate risk analysis...</div>';
    
    try {
        const response = await fetch(`${API_URL}/intelligence/climate-analysis-district`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div class=\"result-card\"><h3>Climate & Environmental Risk Analysis</h3>';
            html += '<table class=\"data-table\"><tr><th>District</th><th>Flood Risk</th><th>Heat Vulnerability</th><th>Resilience</th></tr>';
            data.data.districts.forEach(district => {
                html += `<tr><td>${district.district}</td><td>${(district.floodRisk * 100).toFixed(1)}%</td><td>${(district.heatVulnerability * 100).toFixed(1)}%</td><td>${(district.resilienceScore * 100).toFixed(1)}%</td></tr>`;
            });
            html += '</table></div>';
            result.innerHTML = html;
        }
    } catch (error) {
        result.innerHTML = '<div class=\"error\">Error loading climate risk</div>';
    }
}

async function loadEmergencyResponse() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = `
        <div class=\"result-card\">
            <h3>Emergency Response Optimization</h3>
            <div class=\"form-group\">
                <label>Select Asset</label>
                <select id=\"emergencyAsset\" style=\"padding: 0.5rem;\">
                    <option value=\"\">Select Asset</option>
                </select>
            </div>
            <div class=\"form-group\">
                <label>Failure Type</label>
                <input type=\"text\" id=\"emergencyType\" placeholder=\"e.g., Water Pipeline Burst\" style=\"padding: 0.5rem;\">
            </div>
            <button class=\"btn btn-primary\" onclick=\"optimizeEmergencyResponse()\">Optimize Response</button>
            <div id=\"emergencyResult\"></div>
        </div>
    `;
    loadAdvancedAssetDropdowns();
}

async function optimizeEmergencyResponse() {
    const assetId = document.getElementById('emergencyAsset').value;
    const failureType = document.getElementById('emergencyType').value;
    
    if (!assetId || !failureType) return alert('Fill all fields');
    
    try {
        const response = await fetch(`${API_URL}/intelligence/emergency-response`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ assetId: parseInt(assetId), failureType })
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div style=\"margin-top: 1rem;\"><h4>Emergency Response Plan</h4>';
            html += `<p><strong>Emergency ID:</strong> ${data.data.emergencyId}</p>`;
            html += `<p><strong>Nearest Contractor:</strong> ${data.data.nearestContractor.name} (${data.data.nearestContractor.distance} km, ETA: ${data.data.nearestContractor.eta} min)</p>`;
            html += `<p><strong>Emergency Team:</strong> ${data.data.emergencyTeam.team} (${data.data.emergencyTeam.contact})</p>`;
            html += `<p><strong>Estimated Cost:</strong> Rs ${data.data.estimatedCost.toLocaleString()}</p>`;
            html += `<p><strong>Estimated Duration:</strong> ${data.data.estimatedDuration}</p>`;
            html += '<h4>Required Resources:</h4><ul>';
            data.data.resources.forEach(resource => {
                html += `<li>${resource}</li>`;
            });
            html += '</ul></div>';
            document.getElementById('emergencyResult').innerHTML = html;
        }
    } catch (error) {
        document.getElementById('emergencyResult').innerHTML = '<div class=\"error\">Error optimizing emergency response</div>';
    }
}

async function loadEquityAnalysis() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = '<div class=\"loading\">Analyzing infrastructure equity...</div>';
    
    try {
        const response = await fetch(`${API_URL}/intelligence/equity-analysis`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div class=\"result-card\"><h3>Infrastructure Equity Analysis</h3>';
            html += '<table class=\"data-table\"><tr><th>District</th><th>Investment</th><th>Population</th><th>Per Capita</th><th>Equity Score</th></tr>';
            data.data.districtAnalysis.forEach(district => {
                html += `<tr><td>${district.district}</td><td>Rs ${district.investment.toLocaleString()}</td><td>${district.population.toLocaleString()}</td><td>Rs ${district.perCapita}</td><td>${district.equityScore}</td></tr>`;
            });
            html += '</table>';
            html += `<p><strong>Highest Investment:</strong> ${data.data.imbalance.highestInvestment}</p>`;
            html += `<p><strong>Lowest Investment:</strong> ${data.data.imbalance.lowestInvestment}</p>`;
            html += `<p><strong>Gap:</strong> Rs ${data.data.imbalance.gap.toLocaleString()}</p>`;
            html += '<h4>Recommendations:</h4><ul>';
            data.data.recommendations.forEach(rec => {
                html += `<li>${rec}</li>`;
            });
            html += '</ul></div>';
            result.innerHTML = html;
        }
    } catch (error) {
        result.innerHTML = '<div class=\"error\">Error analyzing equity</div>';
    }
}

async function loadComprehensiveDashboard() {
    const result = document.getElementById('intelligenceResult');
    result.innerHTML = '<div class=\"loading\">Loading comprehensive dashboard...</div>';
    
    try {
        const response = await fetch(`${API_URL}/intelligence/comprehensive-dashboard`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success) {
            let html = '<div class="result-card"><h3>Unified Intelligence Dashboard</h3>';
            html += '<div class="modules-grid">';
            
            Object.keys(data.data.modules).forEach(key => {
                const module = data.data.modules[key];
                html += `<div class="module-card"><h4>${module.name}</h4>`;
                html += `<p>${JSON.stringify(module).substring(0, 100)}...</p></div>`;
            });
            
            html += '</div>';
            html += '<h4>Action Items:</h4><ul>';
            data.data.actionItems.forEach(item => {
                html += `<li><strong>${item.priority}:</strong> ${item.action} (${item.module}) - ${item.recommendation}</li>`;
            });
            html += '</ul></div>';
            result.innerHTML = html;
        } else {
            result.innerHTML = '<div class="error">No data available</div>';
        }
    } catch (error) {
        console.error('Comprehensive dashboard error:', error);
        result.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
    }
}

// Update asset dropdown loader to include root cause and emergency selects
const originalLoadDropdowns = loadAdvancedAssetDropdowns;
loadAdvancedAssetDropdowns = async function() {
    await originalLoadDropdowns();
    
    // Also populate root cause and emergency dropdowns if they exist
    const rootCauseSelect = document.getElementById('rootCauseAsset');
    const emergencySelect = document.getElementById('emergencyAsset');
    
    if (rootCauseSelect || emergencySelect) {
        try {
            const response = await fetch(`${API_URL}/assets`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const assets = await response.json();
            
            if (rootCauseSelect) {
                rootCauseSelect.innerHTML = '<option value=\"\">Select Asset</option>';
                assets.forEach(asset => {
                    rootCauseSelect.innerHTML += `<option value=\"${asset.id}\">${asset.name} (${asset.type})</option>`;
                });
            }
            
            if (emergencySelect) {
                emergencySelect.innerHTML = '<option value=\"\">Select Asset</option>';
                assets.forEach(asset => {
                    emergencySelect.innerHTML += `<option value=\"${asset.id}\">${asset.name} (${asset.type})</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading asset dropdowns:', error);
        }
    }
};
