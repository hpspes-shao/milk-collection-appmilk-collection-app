// ==========================================
// KONDIKI MILK COLLECTION MANAGEMENT SYSTEM
// Single-file Node.js / Express Application (index.js)
// Live URL: https://kondiki-milk-collection-app.onrender.com/
// ==========================================

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'kondiki_milk_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// ==========================================
// IN-MEMORY DATABASE & INITIAL SEED DATA
// ==========================================
let db = {
    users: [
        { id: 1, username: 'admin', passkey: '1234', role: 'SuperAdmin', fullName: 'System Super Admin', createdDate: new Date().toISOString() }
    ],
    farmers: [
        { farmerId: 'kmk000001', name: 'John Makumbusho', phone: '+255712345678', passkey: '1982', village: 'Kondiki Central', registeredDate: new Date().toISOString() },
        { farmerId: 'kmk000002', name: 'Amina Salum', phone: '+255789123456', passkey: '4321', village: 'Mwembeni', registeredDate: new Date().toISOString() }
    ],
    collections: [
        { id: 1, farmerId: 'kmk000001', liters: 45.5, shift: 'Morning', date: '2026-10-01', recordedBy: 'admin' },
        { id: 2, farmerId: 'kmk000002', liters: 30.0, shift: 'Morning', date: '2026-10-01', recordedBy: 'admin' },
        { id: 3, farmerId: 'kmk000001', liters: 50.0, shift: 'Evening', date: '2026-10-02', recordedBy: 'admin' },
        { id: 4, farmerId: 'kmk000002', liters: 38.5, shift: 'Morning', date: '2026-10-03', recordedBy: 'admin' }
    ],
    settings: {
        pricePerLiter: 1200, // TZS
        collectionCenter: 'Kondiki Primary Dairy Hub'
    }
};

// Helper: Generate next farmer ID (kmk000001, kmk000002, ...)
function generateNextFarmerId() {
    if (db.farmers.length === 0) return 'kmk000001';
    let lastId = db.farmers[db.farmers.length - 1].farmerId; // e.g. kmk000005
    let numStr = lastId.replace('kmk', '');
    let nextNum = parseInt(numStr, 10) + 1;
    return 'kmk' + String(nextNum).padStart(6, '0');
}

// Helper: Generate random 4-digit passkey
function generatePasskey() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// ==========================================
// HTML TEMPLATE BUILDER (Professional UI)
// ==========================================
function renderLayout(title, content, user = null, activeTab = '') {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | Kondiki Milk Collection</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body class="bg-slate-50 font-sans text-slate-800 antialiased min-h-screen flex flex-col justify-between">
        <div>
            <!-- Top Navbar -->
            <header class="bg-emerald-800 text-white shadow-md sticky top-0 z-50">
                <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                    <div class="flex items-center space-x-3">
                        <div class="bg-emerald-700 p-2 rounded-xl text-emerald-200 shadow-inner">
                            <i class="fa-solid fa-cow text-xl"></i>
                        </div>
                        <div>
                            <h1 class="font-bold text-lg tracking-wide">Kondiki Milk Collection</h1>
                            <p class="text-xs text-emerald-200">Live Server: <span class="font-mono bg-emerald-900 px-1.5 py-0.5 rounded text-[10px]">https://kondiki-milk-collection-app.onrender.com/</span></p>
                        </div>
                    </div>
                    <div>
                        ${user ? `
                            <div class="flex items-center space-x-4">
                                <span class="text-sm bg-emerald-700 px-3 py-1 rounded-full border border-emerald-600">
                                    <i class="fa-solid fa-user-shield mr-1"></i> ${user.name \vert{}\vert{} user.username} (${user.role || 'Farmer'})
                                </span>
                                <a href="/logout" class="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition shadow">
                                    <i class="fa-solid fa-right-from-bracket mr-1"></i> Logout
                                </a>
                            </div>
                        ` : `
                            <span class="text-xs text-emerald-200 bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-700">
                                Secure Portal
                            </span>
                        `}
                    </div>
                </div>
            </header>

            <!-- Main Content Area -->
            <main class="max-w-7xl mx-auto px-4 py-6">
                ${content}
            </main>
        </div>

        <!-- Footer -->
        <footer class="bg-white border-t border-slate-200 mt-12 py-4 text-center text-xs text-slate-500">
            <p>&copy; 2026 Kondiki Milk Collection System &bull; Powered by Professional Full-Stack Architecture</p>
        </footer>
    </body>
    </html>
    `;
}

// ==========================================
// ROUTES: AUTHENTICATION & LOGIN SWITCHTAB
// ==========================================
app.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.user.role === 'Farmer') return res.redirect('/farmer/dashboard');
        return res.redirect('/admin/dashboard');
    }

    const html = `
    <div class="min-h-[75vh] flex items-center justify-center">
        <div class="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div class="bg-gradient-to-r from-emerald-700 to-teal-800 p-6 text-white text-center">
                <div class="inline-block bg-white/10 p-3 rounded-full mb-2">
                    <i class="fa-solid fa-prescription-bottle text-3xl text-emerald-200"></i>
                </div>
                <h2 class="text-2xl font-bold">Kondiki Portal Access</h2>
                <p class="text-emerald-100 text-sm mt-1">Select your portal type to log in securely</p>
            </div>

            <!-- Tab Switcher Header -->
            <div class="flex border-b border-slate-200 bg-slate-100 p-1.5" id="loginTabs">
                <button onclick="switchTab('admin')" id="btnAdmin" class="flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 bg-white text-emerald-800 shadow-sm">
                    <i class="fa-solid fa-user-tie"></i> <span>Admin / Staff</span>
                </button>
                <button onclick="switchTab('farmer')" id="btnFarmer" class="flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 text-slate-600 hover:text-slate-900">
                    <i class="fa-solid fa-user-group"></i> <span>Farmer Portal</span>
                </button>
            </div>

            <div class="p-6">
                <!-- Admin Login Form -->
                <form id="formAdmin" action="/login/admin" method="POST" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Username / ID</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-user"></i></span>
                            <input type="text" name="username" required placeholder="e.g. admin or subadmin" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Password / Passkey</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-lock"></i></span>
                            <input type="password" name="password" required placeholder="••••••••" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition shadow-md text-sm">
                        Login to Admin Dashboard <i class="fa-solid fa-arrow-right ml-1"></i>
                    </button>
                </form>

                <!-- Farmer Login Form -->
                <form id="formFarmer" action="/login/farmer" method="POST" class="space-y-4 hidden">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Farmer ID</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-id-card"></i></span>
                            <input type="text" name="farmerId" required placeholder="e.g. kmk000001" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm uppercase">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">4-Digit Passkey</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-key"></i></span>
                            <input type="password" name="passkey" maxlength="4" required placeholder="e.g. 1982" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm tracking-widest font-mono">
                        </div>
                    </div>
                    <button type="submit" class="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 rounded-xl transition shadow-md text-sm">
                        Access Farmer Portal <i class="fa-solid fa-arrow-right ml-1"></i>
                    </button>
                    <p class="text-center text-xs text-slate-500 mt-2">Passkeys are generated automatically upon registration by admin.</p>
                </form>
            </div>
        </div>
    </div>

    <script>
    function switchTab(type) {
        const btnAdmin = document.getElementById('btnAdmin');
        const btnFarmer = document.getElementById('btnFarmer');
        const formAdmin = document.getElementById('formAdmin');
        const formFarmer = document.getElementById('formFarmer');

        if (type === 'admin') {
            btnAdmin.className = "flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 bg-white text-emerald-800 shadow-sm";
            btnFarmer.className = "flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 text-slate-600 hover:text-slate-900";
            formAdmin.classList.remove('hidden');
            formFarmer.classList.add('hidden');
        } else {
            btnFarmer.className = "flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 bg-white text-teal-800 shadow-sm";
            btnAdmin.className = "flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 text-slate-600 hover:text-slate-900";
            formFarmer.classList.remove('hidden');
            formAdmin.classList.add('hidden');
        }
    }
    </script>
    `;

    res.send(renderLayout('Login Portal', html));
});

// Handle Admin Login
app.post('/login/admin', (req, res) => {
    const { username, password } = req.body;
    let found = db.users.find(u => u.username === username && u.passkey === password);
    if (found) {
        req.session.user = { id: found.id, username: found.username, name: found.fullName, role: found.role };
        return res.redirect('/admin/dashboard');
    }
    res.send(renderLayout('Error', `<div class="p-8 text-center"><div class="bg-rose-100 text-rose-700 p-4 rounded-xl mb-4">Invalid Admin credentials. Try username: <b>admin</b>, password: <b>1234</b></div><a href="/" class="text-emerald-700 font-semibold underline">&larr; Back to Login</a></div>`));
});

// Handle Farmer Login
app.post('/login/farmer', (req, res) => {
    const { farmerId, passkey } = req.body;
    let cleanId = farmerId.trim().toLowerCase();
    let farmer = db.farmers.find(f => f.farmerId === cleanId && f.passkey === passkey);
    if (farmer) {
        req.session.user = { farmerId: farmer.farmerId, name: farmer.name, role: 'Farmer' };
        return res.redirect('/farmer/dashboard');
    }
    res.send(renderLayout('Error', `<div class="p-8 text-center"><div class="bg-rose-100 text-rose-700 p-4 rounded-xl mb-4">Invalid Farmer ID or 4-digit Passkey. Please check with admin.</div><a href="/" class="text-emerald-700 font-semibold underline">&larr; Back to Login</a></div>`));
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================
function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role === 'Farmer') {
        return res.redirect('/');
    }
    next();
}

app.get('/admin/dashboard', requireAdmin, (req, res) => {
    let tab = req.query.tab || 'overview';
    let user = req.session.user;

    // Calculate metrics
    let totalFarmers = db.farmers.length;
    let totalLiters = db.collections.reduce((sum, c) => sum + c.liters, 0);
    let totalValue = totalLiters * db.settings.pricePerLiter;
    let recentCollections = [...db.collections].reverse().slice(0, 5);

    let tabContent = '';

    // 1. OVERVIEW
    if (tab === 'overview') {
        tabContent = `
        <div class="space-y-6">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div class="bg-emerald-100 text-emerald-700 p-4 rounded-xl text-xl"><i class="fa-solid fa-users"></i></div>
                    <div>
                        <p class="text-xs font-bold uppercase text-slate-500">Registered Farmers</p>
                        <h3 class="text-2xl font-bold text-slate-800">${totalFarmers}</h3>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div class="bg-blue-100 text-blue-700 p-4 rounded-xl text-xl"><i class="fa-solid fa-droplet"></i></div>
                    <div>
                        <p class="text-xs font-bold uppercase text-slate-500">Total Milk Collected</p>
                        <h3 class="text-2xl font-bold text-slate-800">${totalLiters.toFixed(1)} <span class="text-sm font-normal">Ltrs</span></h3>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div class="bg-amber-100 text-amber-700 p-4 rounded-xl text-xl"><i class="fa-solid fa-money-bill-wave"></i></div>
                    <div>
                        <p class="text-xs font-bold uppercase text-slate-500">Total Value (TZS)</p>
                        <h3 class="text-2xl font-bold text-slate-800">${totalValue.toLocaleString()}</h3>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div class="bg-purple-100 text-purple-700 p-4 rounded-xl text-xl"><i class="fa-solid fa-tag"></i></div>
                    <div>
                        <p class="text-xs font-bold uppercase text-slate-500">Price / Liter</p>
                        <h3 class="text-2xl font-bold text-slate-800">${db.settings.pricePerLiter} TZS</h3>
                    </div>
                </div>
            </div>

            <!-- Recent Collections Table -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg text-slate-800"><i class="fa-solid fa-clock-rotate-left mr-2 text-emerald-700"></i>Recent Milk Intakes</h3>
                    <a href="/admin/dashboard?tab=operations" class="text-sm text-emerald-700 font-semibold hover:underline">View All &rarr;</a>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold">
                            <tr>
                                <th class="p-3">Date</th>
                                <th class="p-3">Farmer ID & Name</th>
                                <th class="p-3">Shift</th>
                                <th class="p-3">Liters</th>
                                <th class="p-3">Total Payout (TZS)</th>
                                <th class="p-3">Recorded By</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${recentCollections.map(c => {
                                let f = db.farmers.find(x => x.farmerId === c.farmerId);
                                let payout = c.liters * db.settings.pricePerLiter;
                                return `
                                <tr class="hover:bg-slate-50">
                                    <td class="p-3 font-mono text-xs">${c.date}</td>
                                    <td class="p-3 font-medium text-slate-800">${c.farmerId} -${f ? f.name : 'Unknown'}</td>
                                    <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-semibold ${c.shift === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">${c.shift}</span></td>
                                    <td class="p-3 font-bold text-emerald-700">${c.liters} L</td>
                                    <td class="p-3 font-mono">${payout.toLocaleString()}</td>
                                    <td class="p-3 text-slate-500">${c.recordedBy}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }

    // 2. OPERATIONS (Intake Entry & Logs)
    else if (tab === 'operations') {
        let msg = req.query.msg || '';
        tabContent = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Intake Entry Form -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center">
                    <i class="fa-solid fa-plus-circle text-emerald-700 mr-2"></i> New Milk Intake
                </h3>
                ${msg ? `<div class="mb-4 bg-emerald-100 text-emerald-800 p-3 rounded-xl text-sm"><i class="fa-solid fa-check-circle mr-1"></i> ${msg}</div>` : ''}
                <form action="/admin/intake/add" method="POST" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Select Farmer</label>
                        <select name="farmerId" required class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white">
                            <option value="">-- Choose Registered Farmer --</option>
                            ${db.farmers.map(f => `<option value="${f.farmerId}">${f.farmerId} - ${f.name} (${f.village || ''})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Quantity (Liters)</label>
                        <input type="number" step="0.1" min="0.1" name="liters" required placeholder="e.g. 25.5" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Shift</label>
                        <select name="shift" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white">
                            <option value="Morning">Morning Shift</option>
                            <option value="Evening">Evening Shift</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Collection Date</label>
                        <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" required class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                    <button type="submit" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition shadow text-sm">
                        Record Collection <i class="fa-solid fa-check ml-1"></i>
                    </button>
                </form>
            </div>

            <!-- Operations Log Table -->
            <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center">
                    <i class="fa-solid fa-list-check text-emerald-700 mr-2"></i> Complete Collection Ledger
                </h3>
                <div class="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold sticky top-0">
                            <tr>
                                <th class="p-3">ID & Date</th>
                                <th class="p-3">Farmer</th>
                                <th class="p-3">Shift</th>
                                <th class="p-3">Liters</th>
                                <th class="p-3">Amount (TZS)</th>
                                <th class="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${db.collections.map(c => {
                                let f = db.farmers.find(x => x.farmerId === c.farmerId);
                                let amt = c.liters * db.settings.pricePerLiter;
                                return `
                                <tr class="hover:bg-slate-50">
                                    <td class="p-3 font-mono text-xs">#${c.id}<br><span class="text-slate-400">${c.date}</span></td>
                                    <td class="p-3 font-medium text-slate-800">${c.farmerId}<br><span class="text-xs text-slate-500">${f ? f.name : ''}</span></td>
                                    <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-semibold ${c.shift === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">${c.shift}</span></td>
                                    <td class="p-3 font-bold text-emerald-700">${c.liters} L</td>
                                    <td class="p-3 font-mono">${amt.toLocaleString()}</td>
                                    <td class="p-3">
                                        <form action="/admin/intake/delete" method="POST" onsubmit="return confirm('Delete this collection record?');">
                                            <input type="hidden" name="id" value="${c.id}">
                                            <button type="submit" class="text-rose-600 hover:text-rose-800 text-xs font-semibold"><i class="fa-solid fa-trash"></i></button>
                                        </form>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }

    // 3. FARMERS REGISTRAR
    else if (tab === 'farmers') {
        let newFarmerId = generateNextFarmerId();
        let createdMsg = req.query.createdMsg || '';
        let generatedPass = req.query.pass || '';

        tabContent = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Register New Farmer Form -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center">
                    <i class="fa-solid fa-user-plus text-emerald-700 mr-2"></i> Register New Farmer
                </h3>
                ${createdMsg ? `
                    <div class="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm space-y-1">
                        <p class="font-bold"><i class="fa-solid fa-circle-check mr-1"></i> ${createdMsg}</p>
                        <p class="font-mono bg-white p-2 rounded border border-emerald-200 text-xs">Generated Passkey: <b class="text-emerald-700 text-sm">${generatedPass}</b></p>
                        <p class="text-xs text-slate-500">Provide this 4-digit passkey to the farmer for portal login.</p>
                    </div>
                ` : ''}
                <form action="/admin/farmer/add" method="POST" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Assigned Farmer ID (Auto)</label>
                        <input type="text" name="farmerId" value="${newFarmerId}" readonly class="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm font-mono font-bold text-emerald-800">
                        <span class="text-[11px] text-slate-400">Sequential ID starting from kmk000001</span>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Full Name</label>
                        <input type="text" name="name" required placeholder="e.g. Neema Juma" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Phone Number</label>
                        <input type="text" name="phone" required placeholder="+255..." class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Village / Location</label>
                        <input type="text" name="village" placeholder="e.g. Kondiki Center" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                    <div class="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-800">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i> A 4-digit passkey will be <b>automatically generated</b> upon registration.
                    </div>
                    <button type="submit" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition shadow text-sm">
                        Register Farmer <i class="fa-solid fa-id-card ml-1"></i>
                    </button>
                </form>
            </div>

            <!-- Farmers Directory Table -->
            <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center">
                    <i class="fa-solid fa-address-book text-emerald-700 mr-2"></i> Registered Farmers Directory (${db.farmers.length})
                </h3>
                <div class="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold sticky top-0">
                            <tr>
                                <th class="p-3">Farmer ID</th>
                                <th class="p-3">Name</th>
                                <th class="p-3">Phone</th>
                                <th class="p-3">Passkey</th>
                                <th class="p-3">Village</th>
                                <th class="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${db.farmers.map(f => `
                            <tr class="hover:bg-slate-50">
                                <td class="p-3 font-mono font-bold text-emerald-700">${f.farmerId}</td>
                                <td class="p-3 font-medium text-slate-800">${f.name}</td>
                                <td class="p-3 font-mono text-xs">${f.phone}</td>
                                <td class="p-3 font-mono font-bold text-slate-600 bg-slate-100 px-2 rounded">${f.passkey}</td>
                                <td class="p-3 text-slate-500">${f.village || '-'}</td>
                                <td class="p-3">
                                    <form action="/admin/farmer/delete" method="POST" onsubmit="return confirm('Delete farmer ${f.name}? All associated collections will remain.');">
                                        <input type="hidden" name="farmerId" value="${f.farmerId}">
                                        <button type="submit" class="text-rose-600 hover:text-rose-800 text-xs font-semibold"><i class="fa-solid fa-trash"></i></button>
                                    </form>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }

    // 4. REPORTS
    else if (tab === 'reports') {
        let totalL = db.collections.reduce((acc, c) => acc + c.liters, 0);
        let totalV = totalL * db.settings.pricePerLiter;

        // Group by farmer
        let farmerSummary = db.farmers.map(f => {
            let fCols = db.collections.filter(c => c.farmerId === f.farmerId);
            let fLiters = fCols.reduce((sum, c) => sum + c.liters, 0);
            return {
                ...f,
                totalLiters: fLiters,
                totalAmount: fLiters * db.settings.pricePerLiter,
                count: fCols.length
            };
        });

        tabContent = `
        <div class="space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center">
                <div>
                    <h3 class="font-bold text-xl text-slate-800"><i class="fa-solid fa-chart-pie text-emerald-700 mr-2"></i> Comprehensive Financial & Milk Reports</h3>
                    <p class="text-sm text-slate-500 mt-1">Summary of all milk collections across weekly, monthly and annual periods.</p>
                </div>
                <div class="mt-4 md:mt-0 flex space-x-3">
                    <button onclick="window.print()" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow">
                        <i class="fa-solid fa-print mr-1"></i> Print / Export Report
                    </button>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-emerald-700 text-white p-6 rounded-2xl shadow-md">
                    <p class="text-xs uppercase font-bold tracking-wider text-emerald-200">Total Collected Volume</p>
                    <h3 class="text-3xl font-extrabold mt-1">${totalLiters.toFixed(1)} <span class="text-lg font-normal">Liters</span></h3>
                </div>
                <div class="bg-teal-700 text-white p-6 rounded-2xl shadow-md">
                    <p class="text-xs uppercase font-bold tracking-wider text-teal-200">Total Payout Liability</p>
                    <h3 class="text-3xl font-extrabold mt-1">${totalValue.toLocaleString()} <span class="text-lg font-normal">TZS</span></h3>
                </div>
                <div class="bg-slate-800 text-white p-6 rounded-2xl shadow-md">
                    <p class="text-xs uppercase font-bold tracking-wider text-slate-400">Current Unit Price</p>
                    <h3 class="text-3xl font-extrabold mt-1">${db.settings.pricePerLiter} <span class="text-lg font-normal">TZS / Liter</span></h3>
                </div>
            </div>

            <!-- Farmer Payout Ledger Table -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h4 class="font-bold text-lg text-slate-800 mb-4">Farmer Ledger & Payout Summary</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold">
                            <tr>
                                <th class="p-3">Farmer ID</th>
                                <th class="p-3">Name</th>
                                <th class="p-3">Total Deliveries</th>
                                <th class="p-3">Total Liters</th>
                                <th class="p-3">Total Payout (TZS)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${farmerSummary.map(fs => `
                            <tr class="hover:bg-slate-50">
                                <td class="p-3 font-mono font-bold text-emerald-700">${fs.farmerId}</td>
                                <td class="p-3 font-medium text-slate-800">${fs.name}</td>
                                <td class="p-3">${fs.count}</td>
                                <td class="p-3 font-bold text-emerald-700">${fs.totalLiters.toFixed(1)} L</td>
                                <td class="p-3 font-mono font-semibold text-slate-800">${fs.totalAmount.toLocaleString()}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    }

    // 5. MANAGEMENT MENU (Settings, Sub-admin creation, Modify/Delete with SuperAdmin protection)
    else if (tab === 'management') {
        let subMsg = req.query.subMsg || '';
        let errSub = req.query.errSub || '';
        let priceMsg = req.query.priceMsg || '';

        tabContent = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Settings Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center">
                    <i class="fa-solid fa-gear text-emerald-700 mr-2"></i> System Settings & Pricing
                </h3>
                ${priceMsg ? `<div class="mb-4 bg-emerald-100 text-emerald-800 p-3 rounded-xl text-sm">${priceMsg}</div>` : ''}
                <form action="/admin/settings/update" method="POST" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Collection Center Name</label>
                        <input type="text" name="collectionCenter" value="${db.settings.collectionCenter}" required class="w-full p-2.5 border border-slate-300 rounded-xl text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Price Per Liter (TZS)</label>
                        <input type="number" name="pricePerLiter" value="${db.settings.pricePerLiter}" required class="w-full p-2.5 border border-slate-300 rounded-xl text-sm">
                    </div>
                    <button type="submit" class="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition shadow">
                        Save Settings
                    </button>
                </form>
            </div>

            <!-- Sub-Admin Management Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-4 flex items-center">
                    <i class="fa-solid fa-user-shield text-emerald-700 mr-2"></i> Sub-Admin Management
                </h3>
                <p class="text-xs text-slate-500 mb-4">Create sub-administrators to assist with intake and farmer registration. Sub-admins are blocked from deleting main super-admin accounts.</p>
                
                ${subMsg ? `<div class="mb-4 bg-emerald-100 text-emerald-800 p-3 rounded-xl text-sm">${subMsg}</div>` : ''}
                ${errSub ? `<div class="mb-4 bg-rose-100 text-rose-800 p-3 rounded-xl text-sm"><i class="fa-solid fa-triangle-exclamation mr-1"></i> ${errSub}</div>` : ''}

                <form action="/admin/subadmin/add" method="POST" class="space-y-4 mb-6">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Username</label>
                            <input type="text" name="username" required placeholder="subadmin_name" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Password</label>
                            <input type="password" name="password" required placeholder="••••" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Full Name</label>
                        <input type="text" name="fullName" required placeholder="Full Name" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm">
                    </div>
                    <button type="submit" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl text-sm transition shadow">
                        Create Sub-Admin <i class="fa-solid fa-plus ml-1"></i>
                    </button>
                </form>

                <h4 class="font-bold text-sm uppercase text-slate-600 mb-2">Existing System Users</h4>
                <div class="space-y-2">
                    ${db.users.map(u => `
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <p class="font-bold text-sm text-slate-800">${u.fullName} (${u.username})</p>
                            <span class="text-[11px] px-2 py-0.5 rounded font-semibold ${u.role === 'SuperAdmin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">${u.role}</span>
                        </div>
                        <div>
                            ${u.role === 'SuperAdmin' ? '<span class="text-xs text-slate-400 italic">Protected</span>' : `
                            <form action="/admin/user/delete" method="POST" onsubmit="return confirm('Delete sub-admin ${u.username}?');">
                                <input type="hidden" name="id" value="${u.id}">
                                <button type="submit" class="text-rose-600 hover:text-rose-800 text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded shadow-sm"><i class="fa-solid fa-trash"></i> Delete</button>
                            </form>`}
                        </div>
                    </div>`).join('')}
                </div>
            </div>
        </div>
        `;
    }

    // Dashboard Shell Layout with Sidebar Navigation
    const dashboardHtml = `
    <div class="space-y-6">
        <!-- Navigation Tabs Bar -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-wrap gap-2 items-center justify-between">
            <div class="flex flex-wrap gap-1">
                <a href="/admin/dashboard?tab=overview" class="px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === 'overview' ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}">
                    <i class="fa-solid fa-chart-line mr-1.5"></i> Overview
                </a>
                <a href="/admin/dashboard?tab=operations" class="px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === 'operations' ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}">
                    <i class="fa-solid fa-droplet mr-1.5"></i> Intake Entry
                </a>
                <a href="/admin/dashboard?tab=farmers" class="px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === 'farmers' ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}">
                    <i class="fa-solid fa-users-gear mr-1.5"></i> Farmers Registrar
                </a>
                <a href="/admin/dashboard?tab=reports" class="px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === 'reports' ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}">
                    <i class="fa-solid fa-file-invoice-dollar mr-1.5"></i> Reports
                </a>
                <a href="/admin/dashboard?tab=management" class="px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === 'management' ? 'bg-emerald-700 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}">
                    <i class="fa-solid fa-screwdriver-wrench mr-1.5"></i> Management Menu
                </a>
            </div>
            <div class="px-3 text-xs text-slate-500 font-mono">
                Center: <b>${db.settings.collectionCenter}</b>
            </div>
        </div>

        <!-- Dynamic Tab Content -->
        <div>
            ${tabContent}
        </div>
    </div>
    `;

    res.send(renderLayout('Admin Dashboard', dashboardHtml, user));
});

// Admin Post Endpoints
app.post('/admin/intake/add', requireAdmin, (req, res) => {
    const { farmerId, liters, shift, date } = req.body;
    db.collections.push({
        id: db.collections.length + 1,
        farmerId,
        liters: parseFloat(liters),
        shift,
        date,
        recordedBy: req.session.user.username
    });
    res.redirect('/admin/dashboard?tab=operations&msg=Collection+successfully+recorded!');
});

app.post('/admin/intake/delete', requireAdmin, (req, res) => {
    const { id } = req.body;
    db.collections = db.collections.filter(c => c.id !== parseInt(id));
    res.redirect('/admin/dashboard?tab=operations');
});

app.post('/admin/farmer/add', requireAdmin, (req, res) => {
    const { name, phone, village } = req.body;
    const farmerId = generateNextFarmerId();
    const passkey = generatePasskey();

    db.farmers.push({
        farmerId,
        name,
        phone,
        passkey,
        village: village || '',
        registeredDate: new Date().toISOString()
    });

    res.redirect(`/admin/dashboard?tab=farmers&createdMsg=Farmer+${name}+registered+successfully!&pass=${passkey}`);
});

app.post('/admin/farmer/delete', requireAdmin, (req, res) => {
    const { farmerId } = req.body;
    db.farmers = db.farmers.filter(f => f.farmerId !== farmerId);
    res.redirect('/admin/dashboard?tab=farmers');
});

app.post('/admin/settings/update', requireAdmin, (req, res) => {
    const { collectionCenter, pricePerLiter } = req.body;
    db.settings.collectionCenter = collectionCenter;
    db.settings.pricePerLiter = parseFloat(pricePerLiter);
    res.redirect('/admin/dashboard?tab=management&priceMsg=Settings+updated+successfully!');
});

app.post('/admin/subadmin/add', requireAdmin, (req, res) => {
    const { username, password, fullName } = req.body;
    if (db.users.some(u => u.username === username)) {
        return res.redirect('/admin/dashboard?tab=management&errSub=Username+already+exists.');
    }
    db.users.push({
        id: db.users.length + 1,
        username,
        passkey: password,
        role: 'SubAdmin',
        fullName,
        createdDate: new Date().toISOString()
    });
    res.redirect('/admin/dashboard?tab=management&subMsg=Sub-admin+created+successfully!');
});

app.post('/admin/user/delete', requireAdmin, (req, res) => {
    const { id } = req.body;
    let target = db.users.find(u => u.id === parseInt(id));
    
    // GUARD: Block deleting main SuperAdmin accounts
    if (target && target.role === 'SuperAdmin') {
        return res.redirect('/admin/dashboard?tab=management&errSub=Security+Violation:+Sub-admins+cannot+delete+SuperAdmin+accounts!');
    }

    db.users = db.users.filter(u => u.id !== parseInt(id));
    res.redirect('/admin/dashboard?tab=management&subMsg=User+deleted+successfully!');
});


// ==========================================
// FARMER PORTAL ROUTES
// ==========================================
app.get('/farmer/dashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'Farmer') {
        return res.redirect('/');
    }

    let farmerId = req.session.user.farmerId;
    let farmer = db.farmers.find(f => f.farmerId === farmerId);
    let fCollections = db.collections.filter(c => c.farmerId === farmerId);

    let totalLiters = fCollections.reduce((sum, c) => sum + c.liters, 0);
    let totalEarnings = totalLiters * db.settings.pricePerLiter;

    // Filter by period view if requested (weekly, monthly, yearly)
    let filterView = req.query.view || 'all';
    let filteredCols = fCollections;

    let html = `
    <div class="space-y-6">
        <!-- Farmer Welcome Banner -->
        <div class="bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
                <span class="bg-teal-600 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider">Farmer Portal &bull; ID: ${farmer.farmerId}</span>
                <h2 class="text-2xl font-bold mt-2">Welcome back, ${farmer.name}!</h2>
                <p class="text-teal-100 text-sm mt-0.5"><i class="fa-solid fa-location-dot mr-1"></i> Village: ${farmer.village || 'N/A'} &bull; Phone: ${farmer.phone}</p>
            </div>
            <div class="mt-4 md:mt-0 bg-white/10 backdrop-blur p-4 rounded-xl border border-white/20 text-right">
                <p class="text-xs text-teal-200 uppercase font-bold">Total Lifetime Deliveries</p>
                <p class="text-2xl font-extrabold">${totalLiters.toFixed(1)} Ltrs <span class="text-sm font-normal text-teal-200">(${totalEarnings.toLocaleString()} TZS)</span></p>
            </div>
        </div>

        <!-- Records & Breakdown Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 class="font-bold text-lg text-slate-800"><i class="fa-solid fa-clipboard-list text-teal-700 mr-2"></i> Individual Milk Records</h3>
                
                <!-- Timeframe Selector Tabs (Weekly, Monthly, Yearly) -->
                <div class="flex bg-slate-100 p-1 rounded-xl text-sm font-semibold">
                    <a href="/farmer/dashboard?view=all" class="px-3 py-1.5 rounded-lg transition ${filterView === 'all' ? 'bg-teal-700 text-white shadow' : 'text-slate-600 hover:text-slate-900'}">All Records</a>
                    <a href="/farmer/dashboard?view=weekly" class="px-3 py-1.5 rounded-lg transition ${filterView === 'weekly' ? 'bg-teal-700 text-white shadow' : 'text-slate-600 hover:text-slate-900'}">Weekly</a>
                    <a href="/farmer/dashboard?view=monthly" class="px-3 py-1.5 rounded-lg transition ${filterView === 'monthly' ? 'bg-teal-700 text-white shadow' : 'text-slate-600 hover:text-slate-900'}">Monthly</a>
                    <a href="/farmer/dashboard?view=yearly" class="px-3 py-1.5 rounded-lg transition ${filterView === 'yearly' ? 'bg-teal-700 text-white shadow' : 'text-slate-600 hover:text-slate-900'}">Yearly</a>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold">
                        <tr>
                            <th class="p-3">Date</th>
                            <th class="p-3">Shift</th>
                            <th class="p-3">Quantity (Liters)</th>
                            <th class="p-3">Unit Price (TZS)</th>
                            <th class="p-3">Total Payout (TZS)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${fCollections.length === 0 ? `
                            <tr><td colspan="5" class="p-6 text-center text-slate-400">No milk collection records found yet.</td></tr>
                        ` : fCollections.map(c => {
                            let payout = c.liters * db.settings.pricePerLiter;
                            return `
                            <tr class="hover:bg-slate-50">
                                <td class="p-3 font-mono text-xs">${c.date}</td>
                                <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-semibold ${c.shift === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">${c.shift}</span></td>
                                <td class="p-3 font-bold text-teal-700">${c.liters} L</td>
                                <td class="p-3 font-mono text-slate-500">${db.settings.pricePerLiter}</td>
                                <td class="p-3 font-mono font-semibold text-slate-800">${payout.toLocaleString()}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;

    res.send(renderLayout('Farmer Portal', html, req.session.user));
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
app.listen(PORT, () => {
    console.log(`Kondiki Milk Collection Server running on port ${PORT}`);
    console.log(`Live URL: https://kondiki-milk-collection-app.onrender.com/`);
});
