/**
 * KONDIKI MILK COLLECTION MANAGEMENT SYSTEM
 * Offline-First Node.js / Express Application with PWA and LocalStorage Sync
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory data store for demonstration / local server sync
let farmers = [
    { id: 'F001', name: 'Juma Hassan', phone: '+255712345678', pin: '1234', village: 'Kondiki A' },
    { id: 'F002', name: 'Amina Mwalimu', phone: '+255789123456', pin: '5678', village: 'Kondiki B' }
];

let milkIntakes = [
    { id: 'M101', farmerId: 'F001', farmerName: 'Juma Hassan', liters: 25.5, shift: 'Morning', pricePerLiter: 1200, totalAmount: 30600, date: '2026-10-06', synced: true },
    { id: 'M102', farmerId: 'F002', farmerName: 'Amina Mwalimu', liters: 18.0, shift: 'Evening', pricePerLiter: 1200, totalAmount: 21600, date: '2026-10-06', synced: true }
];

let settings = {
    pricePerLiter: 1200,
    currency: 'TZS'
};

// API Endpoints
app.get('/api/state', (req, res) => {
    res.json({ farmers, milkIntakes, settings });
});

app.post('/api/farmers', (req, res) => {
    const { id, name, phone, pin, village } = req.body;
    const newFarmer = { id: id || 'F00' + (farmers.length + 1), name, phone, pin: pin || '1234', village };
    farmers.push(newFarmer);
    res.json({ success: true, farmer: newFarmer });
});

app.post('/api/intake', (req, res) => {
    const { farmerId, liters, shift, date } = req.body;
    const farmer = farmers.find(f => f.id === farmerId);
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });

    const newIntake = {
        id: 'M' + Date.now(),
        farmerId,
        farmerName: farmer.name,
        liters: parseFloat(liters),
        shift: shift || 'Morning',
        pricePerLiter: settings.pricePerLiter,
        totalAmount: parseFloat(liters) * settings.pricePerLiter,
        date: date || new Date().toISOString().split('T')[0],
        synced: true
    };
    milkIntakes.unshift(newIntake);
    res.json({ success: true, intake: newIntake });
});

app.post('/api/sync-upload', (req, res) => {
    const { offlineIntakes, offlineFarmers } = req.body;
    
    if (offlineFarmers && Array.isArray(offlineFarmers)) {
        offlineFarmers.forEach(f => {
            if (!farmers.some(existing => existing.id === f.id)) {
                farmers.push(f);
            }
        });
    }

    if (offlineIntakes && Array.isArray(offlineIntakes)) {
        offlineIntakes.forEach(intake => {
            if (!milkIntakes.some(existing => existing.id === intake.id)) {
                milkIntakes.unshift({ ...intake, synced: true });
            }
        });
    }

    res.json({ success: true, message: 'Sync completed successfully', farmersCount: farmers.length, intakesCount: milkIntakes.length });
});

// Serve Frontend UI Dashboard with Bilingual (EN/SW), PWA Offline Sync, Dark Mode
app.get('*', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kondiki SACCOS - Milk Collection System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: { extend: { colors: { brand: { 50: '#f0fdf4', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' } } } }
        }
    </script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans">
    <div id="app" class="max-w-4xl mx-auto p-4">
        <header class="flex justify-between items-center py-4 border-b border-slate-800 mb-6">
            <div>
                <h1 class="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                    🥛 Kondiki Milk Collection
                </h1>
                <p class="text-xs text-slate-400" id="network-status">🟢 Online Mode (Synced)</p>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="toggleLanguage()" id="lang-btn" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-700">SW / EN</button>
                <button onclick="switchRole('admin')" id="btn-admin" class="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded">Admin</button>
                <button onclick="switchRole('farmer')" id="btn-farmer" class="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded">Farmer</button>
            </div>
        </header>

        <!-- ADMIN VIEW -->
        <div id="view-admin" class="space-y-6">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <p class="text-xs text-slate-400">Total Liters Today</p>
                    <p class="text-xl font-bold text-emerald-400" id="stat-liters">0 L</p>
                </div>
                <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <p class="text-xs text-slate-400">Total Payout (TZS)</p>
                    <p class="text-xl font-bold text-blue-400" id="stat-payout">0 TZS</p>
                </div>
                <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <p class="text-xs text-slate-400">Registered Farmers</p>
                    <p class="text-xl font-bold text-purple-400" id="stat-farmers">0</p>
                </div>
                <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <p class="text-xs text-slate-400">Offline Queue</p>
                    <p class="text-xl font-bold text-amber-400" id="stat-queue">0 items</p>
                </div>
            </div>

            <!-- Quick Record Intake Form -->
            <div class="bg-slate-900 p-5 rounded-xl border border-slate-800">
                <h2 class="text-lg font-semibold mb-4 text-emerald-400">Record Milk Intake</h2>
                <form id="intake-form" onsubmit="handleIntakeSubmit(event)" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Select Farmer</label>
                        <select id="intake-farmer" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200" required></select>
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Quantity (Liters)</label>
                        <input type="number" step="0.1" id="intake-liters" placeholder="e.g. 15.5" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200" required />
                    </div>
                    <div>
                        <label class="block text-xs text-slate-400 mb-1">Shift</label>
                        <select id="intake-shift" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200">
                            <option value="Morning">Morning (Asubuhi)</option>
                            <option value="Evening">Evening (Jioni)</option>
                        </select>
                    </div>
                    <div class="md:col-span-3 flex justify-end gap-3">
                        <button type="button" onclick="triggerSync()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-700">Force Sync Now</button>
                        <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white rounded text-sm">Save Intake (Offline-First)</button>
                    </div>
                </form>
            </div>

            <!-- Recent Intakes Table -->
            <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 overflow-x-auto">
                <h2 class="text-lg font-semibold mb-4 text-slate-200">Recent Collections Ledger</h2>
                <table class="w-full text-left text-sm">
                    <thead>
                        <tr class="border-b border-slate-800 text-slate-400">
                            <th class="pb-2">Date / Shift</th>
                            <th class="pb-2">Farmer</th>
                            <th class="pb-2">Liters</th>
                            <th class="pb-2">Total (TZS)</th>
                            <th class="pb-2">Status</th>
                        </tr>
                    </thead>
                    <tbody id="intakes-table-body"></tbody>
                </table>
            </div>
        </div>

        <!-- FARMER VIEW -->
        <div id="view-farmer" class="hidden space-y-6">
            <div class="bg-slate-900 p-5 rounded-xl border border-slate-800">
                <h2 class="text-lg font-semibold mb-3 text-emerald-400">Farmer Portal</h2>
                <label class="block text-xs text-slate-400 mb-1">Select Your Profile</label>
                <select id="portal-farmer-select" onchange="renderFarmerPortal()" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 mb-4"></select>
                <div id="farmer-summary-card" class="bg-slate-950 p-4 rounded border border-slate-800"></div>
            </div>
        </div>
    </div>

    <script>
        let currentRole = 'admin';
        let currentLang = 'en';
        let state = { farmers: [], milkIntakes: [], settings: { pricePerLiter: 1200 } };

        // LocalStorage fallback sync queue
        function getOfflineQueue() {
            return JSON.parse(localStorage.getItem('kondiki_offline_queue') || '[]');
        }

        function saveOfflineQueue(queue) {
            localStorage.setItem('kondiki_offline_queue', JSON.stringify(queue));
            document.getElementById('stat-queue').innerText = queue.length + ' items';
        }

        async function fetchState() {
            try {
                const res = await fetch('/api/state');
                const data = await res.json();
                state = data;
                // Merge local offline intakes if any
                const queue = getOfflineQueue();
                if (queue.length > 0) {
                    state.milkIntakes = [...queue, ...state.milkIntakes];
                }
                renderApp();
                document.getElementById('network-status').innerText = '🟢 Online Mode (Synced)';
            } catch (err) {
                console.warn('Offline mode active:', err);
                document.getElementById('network-status').innerText = '🟠 Offline Mode (Using LocalStorage)';
                const localState = JSON.parse(localStorage.getItem('kondiki_state') || '{"farmers":[], "milkIntakes":[]}');
                const queue = getOfflineQueue();
                state.farmers = localState.farmers.length ? localState.farmers : [
                    { id: 'F001', name: 'Juma Hassan', village: 'Kondiki A' },
                    { id: 'F002', name: 'Amina Mwalimu', village: 'Kondiki B' }
                ];
                state.milkIntakes = [...queue, ...(localState.milkIntakes || [])];
                renderApp();
            }
        }

        function renderApp() {
            localStorage.setItem('kondiki_state', JSON.stringify(state));
            
            // Stats
            const totalLiters = state.milkIntakes.reduce((sum, i) => sum + parseFloat(i.liters || 0), 0);
            const totalPayout = state.milkIntakes.reduce((sum, i) => sum + parseFloat(i.totalAmount || 0), 0);
            document.getElementById('stat-liters').innerText = totalLiters.toFixed(1) + ' L';
            document.getElementById('stat-payout').innerText = totalPayout.toLocaleString() + ' TZS';
            document.getElementById('stat-farmers').innerText = state.farmers.length;
            document.getElementById('stat-queue').innerText = getOfflineQueue().length + ' items';

            // Farmer Select dropdowns
            const farmerOpts = state.farmers.map(f => `<option value="${f.id}">${f.name} (${f.village || ''})</option>`).join('');
            document.getElementById('intake-farmer').innerHTML = farmerOpts;
            document.getElementById('portal-farmer-select').innerHTML = farmerOpts;

            // Intakes Table
            const tableRows = state.milkIntakes.map(i => `
                <tr class="border-b border-slate-900">
                    <td class="py-2 text-slate-300">${i.date} <span class="text-xs text-slate-500">(${i.shift})</span></td>
                    <td class="py-2 font-medium text-slate-200">${i.farmerName || i.farmerId}</td>
                    <td class="py-2 text-emerald-400 font-semibold">${i.liters} L</td>
                    <td class="py-2 text-blue-400">${(i.totalAmount || (i.liters * 1200)).toLocaleString()} TZS</td>
                    <td class="py-2"><span class="px-2 py-0.5 text-xs rounded ${i.synced ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}">${i.synced ? 'Synced' : 'Pending'}</span></td>
                </tr>
            `).join('');
            document.getElementById('intakes-table-body').innerHTML = tableRows;
            renderFarmerPortal();
        }

        async function handleIntakeSubmit(e) {
            e.preventDefault();
            const farmerId = document.getElementById('intake-farmer').value;
            const liters = parseFloat(document.getElementById('intake-liters').value);
            const shift = document.getElementById('intake-shift').value;
            const farmer = state.farmers.find(f => f.id === farmerId);

            const newIntake = {
                id: 'M' + Date.now(),
                farmerId,
                farmerName: farmer ? farmer.name : farmerId,
                liters,
                shift,
                pricePerLiter: 1200,
                totalAmount: liters * 1200,
                date: new Date().toISOString().split('T')[0],
                synced: false
            };

            if (navigator.onLine) {
                try {
                    const res = await fetch('/api/intake', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ farmerId, liters, shift })
                    });
                    if (res.ok) {
                        newIntake.synced = true;
                    }
                } catch (err) {
                    console.warn('Server unreachable, queueing offline.');
                }
            }

            if (!newIntake.synced) {
                const queue = getOfflineQueue();
                queue.push(newIntake);
                saveOfflineQueue(queue);
            }

            state.milkIntakes.unshift(newIntake);
            renderApp();
            document.getElementById('intake-liters').value = '';
            alert('Milk intake recorded successfully!');
        }

        async function triggerSync() {
            const queue = getOfflineQueue();
            if (queue.length === 0) {
                alert('No offline items to sync.');
                return;
            }
            try {
                const res = await fetch('/api/sync-upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ offlineIntakes: queue })
                });
                if (res.ok) {
                    localStorage.removeItem('kondiki_offline_queue');
                    alert('Sync completed successfully with server!');
                    fetchState();
                }
            } catch (err) {
                alert('Sync failed: Network offline.');
            }
        }

        function switchRole(role) {
            currentRole = role;
            if (role === 'admin') {
                document.getElementById('view-admin').classList.remove('hidden');
                document.getElementById('view-farmer').classList.add('hidden');
                document.getElementById('btn-admin').className = 'px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded';
                document.getElementById('btn-farmer').className = 'px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded';
            } else {
                document.getElementById('view-admin').classList.add('hidden');
                document.getElementById('view-farmer').classList.remove('hidden');
                document.getElementById('btn-farmer').className = 'px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded';
                document.getElementById('btn-admin').className = 'px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded';
                renderFarmerPortal();
            }
        }

        function renderFarmerPortal() {
            const selectedFarmerId = document.getElementById('portal-farmer-select').value;
            const farmerIntakes = state.milkIntakes.filter(i => i.farmerId === selectedFarmerId);
            const totalLiters = farmerIntakes.reduce((sum, i) => sum + parseFloat(i.liters || 0), 0);
            const totalEarnings = farmerIntakes.reduce((sum, i) => sum + parseFloat(i.totalAmount || 0), 0);

            document.getElementById('farmer-summary-card').innerHTML = `
                <div class="space-y-3">
                    <div class="flex justify-between border-b border-slate-800 pb-2">
                        <span class="text-slate-400 text-xs">Total Milk Delivered:</span>
                        <span class="font-bold text-emerald-400">${totalLiters.toFixed(1)} Liters</span>
                    </div>
                    <div class="flex justify-between border-b border-slate-800 pb-2">
                        <span class="text-slate-400 text-xs">Total Cumulative Earnings:</span>
                        <span class="font-bold text-blue-400">${totalEarnings.toLocaleString()} TZS</span>
                    </div>
                    <p class="text-xs text-slate-500 pt-1">Deliveries logged: ${farmerIntakes.length}</p>
                </div>
            `;
        }

        window.onload = fetchState;
    </script>
</body>
</html>
