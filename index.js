// ==========================================
// KONDIKI MILK COLLECTION MANAGEMENT SYSTEM
// Offline-First Hybrid Sync Architecture (index.js)
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

// Helper: Generate next farmer ID
function generateNextFarmerId() {
    if (db.farmers.length === 0) return 'kmk000001';
    let lastId = db.farmers[db.farmers.length - 1].farmerId;
    let numStr = lastId.replace('kmk', '');
    let nextNum = parseInt(numStr, 10) + 1;
    return 'kmk' + String(nextNum).padStart(6, '0');
}

// Helper: Generate random 4-digit passkey
function generatePasskey() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// ==========================================
// SYNC API ENDPOINTS (Cloud <-> Offline Client)
// ==========================================
app.get('/api/sync-data', (req, res) => {
    res.json({
        farmers: db.farmers,
        collections: db.collections,
        settings: db.settings
    });
});

app.post('/api/sync-upload', (req, res) => {
    const { offlineIntakes, offlineFarmers } = req.body;

    // Merge offline registered farmers
    if (offlineFarmers && Array.isArray(offlineFarmers)) {
        offlineFarmers.forEach(of => {
            if (!db.farmers.some(f => f.farmerId === of.farmerId)) {
                db.farmers.push(of);
            }
        });
    }

    // Merge offline collections
    if (offlineIntakes && Array.isArray(offlineIntakes)) {
        offlineIntakes.forEach(oi => {
            if (!db.collections.some(c => c.timestamp === oi.timestamp)) {
                db.collections.push({
                    id: db.collections.length + 1,
                    farmerId: oi.farmerId,
                    liters: parseFloat(oi.liters),
                    shift: oi.shift,
                    date: oi.date,
                    recordedBy: oi.recordedBy || 'offline_sync',
                    timestamp: oi.timestamp || Date.now()
                });
            }
        });
    }

    res.json({ success: true, message: 'Cloud synchronized successfully', collectionsCount: db.collections.length, farmersCount: db.farmers.length });
});

// ==========================================
// PWA DYNAMIC MANIFEST & SERVICE WORKER
// ==========================================
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        name: "Kondiki Milk Collection PWA",
        short_name: "KondikiPWA",
        start_url: "/",
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#047857",
        icons: [
            {
                src: "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/1f404.png",
                sizes: "192x192",
                type: "image/png"
            }
        ]
    }));
});

app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
        const CACHE_NAME = 'kondiki-milk-v2';
        const ASSETS_TO_CACHE = [
            '/',
            '/manifest.json'
        ];

        self.addEventListener('install', (event) => {
            event.waitUntil(
                caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
            );
            self.skipWaiting();
        });

        self.addEventListener('activate', (event) => {
            event.waitUntil(
                caches.keys().then((keys) => Promise.all(
                    keys.map((key) => { if (key !== CACHE_NAME) return caches.delete(key); })
                ))
            );
            self.clients.claim();
        });

        self.addEventListener('fetch', (event) => {
            if (event.request.method !== 'GET') return;
            event.respondWith(
                caches.match(event.request).then((cached) => {
                    return cached || fetch(event.request).then((response) => {
                        return caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, response.clone());
                            return response;
                        });
                    }).catch(() => caches.match('/'));
                })
            );
        });
    `);
});

// ==========================================
// HTML LAYOUT (With Offline Auth & Sync Engine)
// ==========================================
function renderLayout(title, content, user = null) {
    const userBadge = user ? `
        <div class="flex items-center space-x-3">
            <span class="text-xs bg-emerald-700 px-3 py-1.5 rounded-full border border-emerald-600 font-medium">
                <i class="fa-solid fa-user-shield mr-1"></i> ${user.name || user.username} (${user.role || 'Farmer'})
            </span>
            <a href="/logout" class="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow">
                <i class="fa-solid fa-right-from-bracket mr-1"></i> Logout
            </a>
        </div>
    ` : `
        <span class="text-xs text-emerald-200 bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-700">
            Offline-Ready Secure Portal
        </span>
    `;

    return `
    <!DOCTYPE html>
    <html id="appHtml" lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | Kondiki Milk Collection</title>
        <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#047857">
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body.dark-mode .bg-slate-50 { background-color: #111827 !important; }
            body.dark-mode .bg-white { background-color: #1f2937 !important; }
            body.dark-mode .bg-slate-100 { background-color: #374151 !important; }
            body.dark-mode .text-slate-800 { color: #e5e7eb !important; }
            body.dark-mode .text-slate-600 { color: #9ca3af !important; }
            body.dark-mode .text-slate-500 { color: #6b7280 !important; }
            body.dark-mode .border-slate-200 { border-color: #374151 !important; }
        </style>
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
                            <h1 class="font-bold text-base tracking-wide">Kondiki Milk Collection</h1>
                            <p class="text-[10px] text-emerald-200">Server: <span class="font-mono bg-emerald-900 px-1 py-0.5 rounded">Render Live</span></p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <!-- Network & Sync Status -->
                        <div id="syncBadge" class="hidden sm:flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-900 text-emerald-200 border border-emerald-600">
                            <span id="netDot" class="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span> 
                            <span id="netText">Online</span>
                            <span id="syncQueueCount" class="ml-2 bg-amber-500 text-slate-900 px-1.5 rounded-full text-[10px] font-bold hidden">0</span>
                        </div>
                        <!-- Language Switch -->
                        <div class="flex bg-emerald-700 rounded-full p-1">
                            <button onclick="switchLanguage('en')" id="langBtnEn" class="px-3 py-1 text-xs font-semibold rounded-full transition bg-white text-emerald-900 shadow-sm">EN</button>
                            <button onclick="switchLanguage('sw')" id="langBtnSw" class="px-3 py-1 text-xs font-semibold rounded-full transition text-emerald-200 hover:text-white">Sw</button>
                        </div>
                        <!-- Dark Mode Switch -->
                        <button onclick="toggleDarkMode()" class="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-full text-xs font-medium transition shadow flex items-center space-x-1">
                            <i class="fa-solid fa-moon"></i>
                            <span id="darkModeText" class="hidden md:inline">Dark</span>
                        </button>
                        ${userBadge}
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
            <p>&copy; 2026 Kondiki Milk Collection System &bull; Offline-First Hybrid Sync Engine</p>
        </footer>

        <script>
            // Dark Mode
            function toggleDarkMode() {
                document.body.classList.toggle('dark-mode');
                const isDark = document.body.classList.contains('dark-mode');
                document.getElementById('darkModeText').textContent = isDark ? 'Light' : 'Dark';
                localStorage.setItem('darkMode', isDark);
            }
            if (localStorage.getItem('darkMode') === 'true') {
                document.body.classList.add('dark-mode');
                document.getElementById('darkModeText').textContent = 'Light';
            }

            // PWA Service Worker Registration
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW failed:', err));
                });
            }

            // Background Sync & Network State Manager
            async function syncWithCloud() {
                if (!navigator.onLine) return;
                let offlineIntakes = JSON.parse(localStorage.getItem('offline_intakes') || '[]');
                let offlineFarmers = JSON.parse(localStorage.getItem('offline_farmers') || '[]');

                if (offlineIntakes.length > 0 || offlineFarmers.length > 0) {
                    try {
                        let res = await fetch('/api/sync-upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ offlineIntakes, offlineFarmers })
                        });
                        let data = await res.json();
                        if (data.success) {
                            localStorage.removeItem('offline_intakes');
                            localStorage.removeItem('offline_farmers');
                            console.log('Background Sync completed successfully.');
                        }
                    } catch (e) {
                        console.log('Sync deferred: Server unreachable.');
                    }
                }

                // Also fetch fresh server data to local cache
                try {
                    let res = await fetch('/api/sync-data');
                    let cloudData = await res.json();
                    localStorage.setItem('cached_db', JSON.stringify(cloudData));
                } catch (e) {}

                updateSyncBadge();
            }

            function updateSyncBadge() {
                const isOnline = navigator.onLine;
                const netDot = document.getElementById('netDot');
                const netText = document.getElementById('netText');
                const syncQueueCount = document.getElementById('syncQueueCount');
                
                let intakes = JSON.parse(localStorage.getItem('offline_intakes') || '[]');
                let farmers = JSON.parse(localStorage.getItem('offline_farmers') || '[]');
                let totalPending = intakes.length + farmers.length;

                if (netDot && netText) {
                    netDot.className = isOnline ? 'w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse' : 'w-2 h-2 rounded-full bg-rose-400 mr-1.5 animate-pulse';
                    netText.textContent = isOnline ? 'Online' : 'Offline Mode';
                }

                if (syncQueueCount) {
                    if (totalPending > 0) {
                        syncQueueCount.textContent = totalPending;
                        syncQueueCount.classList.remove('hidden');
                    } else {
                        syncQueueCount.classList.add('hidden');
                    }
                }
            }

            window.addEventListener('online', () => {
                updateSyncBadge();
                syncWithCloud();
            });
            window.addEventListener('offline', updateSyncBadge);
            
            // Run sync check on load
            updateSyncBadge();
            if (navigator.onLine) {
                syncWithCloud();
            }
        </script>
    </body>
    </html>
    `;
}

// ==========================================
// ROUTES: OFFLINE-READY LOGIN PORTAL
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
                    <i class="fa-solid fa-cow text-3xl text-emerald-200"></i>
                </div>
                <h2 id="loginTitle" class="text-2xl font-bold">Kondiki Portal Access</h2>
                <p id="loginSubtitle" class="text-emerald-100 text-sm mt-1">Works 100% Offline with Local Passkeys</p>
            </div>

            <!-- Tab Switcher -->
            <div class="flex border-b border-slate-200 bg-slate-100 p-1.5" id="loginTabs">
                <button onclick="switchTab('admin')" id="btnAdmin" class="flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 bg-white text-emerald-800 shadow-sm">
                    <i class="fa-solid fa-user-tie"></i> <span id="loginTabAdmin">Admin / Staff</span>
                </button>
                <button onclick="switchTab('farmer')" id="btnFarmer" class="flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-2 text-slate-600 hover:text-slate-900">
                    <i class="fa-solid fa-user-group"></i> <span id="loginTabFarmer">Farmer Portal</span>
                </button>
            </div>

            <div class="p-6">
                <!-- Admin Login Form (Offline Supported) -->
                <form id="formAdmin" onsubmit="handleAdminLogin(event)" class="space-y-4">
                    <div>
                        <label id="adminUsernameLabel" class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Username / ID</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-user"></i></span>
                            <input type="text" id="adminUser" required placeholder="admin" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
                        </div>
                    </div>
                    <div>
                        <label id="adminPasswordLabel" class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Password / Passkey</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-lock"></i></span>
                            <input type="password" id="adminPass" required placeholder="••••" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm">
                        </div>
                    </div>
                    <button type="submit" id="adminButton" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition shadow-md text-sm">
                        Login to Admin Dashboard <i class="fa-solid fa-arrow-right ml-1"></i>
                    </button>
                </form>

                <!-- Farmer Login Form (Offline Supported) -->
                <form id="formFarmer" onsubmit="handleFarmerLogin(event)" class="space-y-4 hidden">
                    <div>
                        <label id="farmerIdLabel" class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Farmer ID</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-id-card"></i></span>
                            <input type="text" id="farmerIdInput" required placeholder="kmk000001" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm uppercase">
                        </div>
                    </div>
                    <div>
                        <label id="farmerPasskeyLabel" class="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">4-Digit Passkey</label>
                        <div class="relative">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><i class="fa-solid fa-key"></i></span>
                            <input type="password" id="farmerPassInput" maxlength="4" required placeholder="1982" class="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm tracking-widest font-mono">
                        </div>
                    </div>
                    <button type="submit" id="farmerButton" class="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 rounded-xl transition shadow-md text-sm">
                        Access Farmer Portal <i class="fa-solid fa-arrow-right ml-1"></i>
                    </button>
                    <p id="passkeyInfo" class="text-center text-xs text-slate-500 mt-2">Passkeys are cached locally for secure offline access.</p>
                </form>
            </div>
        </div>
    </div>

    <script>
    // Initialize local credential cache if missing
    if (!localStorage.getItem('local_db_users')) {
        localStorage.setItem('local_db_users', JSON.stringify(${JSON.stringify(db.users)}));
    }
    if (!localStorage.getItem('local_db_farmers')) {
        localStorage.setItem('local_db_farmers', JSON.stringify(${JSON.stringify(db.farmers)}));
    }

    // Sync cloud DB into localStorage when online
    async function initLocalCache() {
        if (navigator.onLine) {
            try {
                let res = await fetch('/api/sync-data');
                let data = await res.json();
                localStorage.setItem('local_db_farmers', JSON.stringify(data.farmers));
                localStorage.setItem('cached_db', JSON.stringify(data));
            } catch(e) {}
        }
    }
    initLocalCache();

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

    async function handleAdminLogin(e) {
        e.preventDefault();
        let u = document.getElementById('adminUser').value.trim();
        let p = document.getElementById('adminPass').value;

        // Check local cache first for offline login
        let users = JSON.parse(localStorage.getItem('local_db_users') || '[]');
        let found = users.find(x => x.username === u && x.passkey === p);

        if (found) {
            localStorage.setItem('current_user', JSON.stringify({ username: found.username, name: found.fullName, role: found.role }));
            // Also try server login if online to establish session cookie
            if (navigator.onLine) {
                try {
                    await fetch('/login/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: u, password: p })
                    });
                } catch(err) {}
            }
            window.location.href = '/admin/dashboard';
        } else {
            alert('Invalid Admin credentials.');
        }
    }

    async function handleFarmerLogin(e) {
        e.preventDefault();
        let fId = document.getElementById('farmerIdInput').value.trim().toLowerCase();
        let pass = document.getElementById('farmerPassInput').value;

        let farmers = JSON.parse(localStorage.getItem('local_db_farmers') || '[]');
        // Include offline registered farmers too
        let offlineFarmers = JSON.parse(localStorage.getItem('offline_farmers') || '[]');
        let allFarmers = [...farmers, ...offlineFarmers];

        let farmer = allFarmers.find(x => x.farmerId === fId && x.passkey === pass);

        if (farmer) {
            localStorage.setItem('current_user', JSON.stringify({ farmerId: farmer.farmerId, name: farmer.name, role: 'Farmer' }));
            if (navigator.onLine) {
                try {
                    await fetch('/login/farmer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ farmerId: fId, passkey: pass })
                    });
                } catch(err) {}
            }
            window.location.href = '/farmer/dashboard';
        } else {
            alert('Invalid Farmer ID or 4-digit Passkey.');
        }
    }

    const translations = {
        en: {
            loginTitle: "Kondiki Portal Access",
            loginSubtitle: "Works 100% Offline with Local Passkeys",
            loginTabAdmin: "Admin / Staff",
            loginTabFarmer: "Farmer Portal"
        },
        sw: {
            loginTitle: "Upatuzi wa Kondiki",
            loginSubtitle: "Inafanya kazi bila Intaneti",
            loginTabAdmin: "Msimamizi",
            loginTabFarmer: "Portal ya Mkulima"
        }
    };
    function switchLanguage(lang) {
        const t = translations[lang];
        document.getElementById('loginTitle').textContent = t.loginTitle;
        document.getElementById('loginSubtitle').textContent = t.loginSubtitle;
        document.getElementById('loginTabAdmin').textContent = t.loginTabAdmin;
        document.getElementById('loginTabFarmer').textContent = t.loginTabFarmer;
    }
    </script>
    `;

    res.send(renderLayout('Login Portal', html));
});

// Server login fallback handlers
app.post('/login/admin', (req, res) => {
    const { username, password } = req.body;
    let found = db.users.find(u => u.username === username && u.passkey === password);
    if (found) {
        req.session.user = { id: found.id, username: found.username, name: found.fullName, role: found.role };
        return res.json({ success: true });
    }
    res.status(401).json({ success: false });
});

app.post('/login/farmer', (req, res) => {
    const { farmerId, passkey } = req.body;
    let cleanId = farmerId.trim().toLowerCase();
    let farmer = db.farmers.find(f => f.farmerId === cleanId && f.passkey === passkey);
    if (farmer) {
        req.session.user = { farmerId: farmer.farmerId, name: farmer.name, role: 'Farmer' };
        return res.json({ success: true });
    }
    res.status(401).json({ success: false });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// ==========================================
// ADMIN DASHBOARD (Offline-First Sync Engine)
// ==========================================
app.get('/admin/dashboard', (req, res) => {
    let tab = req.query.tab || 'overview';

    let content = `
    <div id="adminAppContainer" class="space-y-6">
        <!-- Navigation Tabs -->
        <div class="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            <button onclick="switchAdminTab('overview')" id="tabBtnOverview" class="px-4 py-2 rounded-xl text-sm font-semibold transition bg-emerald-700 text-white shadow">
                <i class="fa-solid fa-chart-line mr-1.5"></i> Overview
            </button>
            <button onclick="switchAdminTab('operations')" id="tabBtnOperations" class="px-4 py-2 rounded-xl text-sm font-semibold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200">
                <i class="fa-solid fa-droplet mr-1.5"></i> Milk Intake
            </button>
            <button onclick="switchAdminTab('farmers')" id="tabBtnFarmers" class="px-4 py-2 rounded-xl text-sm font-semibold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200">
                <i class="fa-solid fa-users mr-1.5"></i> Farmers
            </button>
            <button onclick="switchAdminTab('reports')" id="tabBtnReports" class="px-4 py-2 rounded-xl text-sm font-semibold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200">
                <i class="fa-solid fa-file-invoice-dollar mr-1.5"></i> Reports
            </button>
            <button onclick="switchAdminTab('management')" id="tabBtnManagement" class="px-4 py-2 rounded-xl text-sm font-semibold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200">
                <i class="fa-solid fa-gear mr-1.5"></i> Settings
            </button>
        </div>

        <!-- Dynamic Content Pane -->
        <div id="adminTabContent">Loading dashboard...</div>
    </div>

    <script>
    let currentAdminTab = '${tab}';

    function getLocalDB() {
        let farmers = JSON.parse(localStorage.getItem('local_db_farmers') || '${JSON.stringify(db.farmers)}');
        let offlineFarmers = JSON.parse(localStorage.getItem('offline_farmers') || '[]');
        let allFarmers = [...farmers, ...offlineFarmers];

        let collections = JSON.parse(localStorage.getItem('local_db_collections') || '${JSON.stringify(db.collections)}');
        let offlineIntakes = JSON.parse(localStorage.getItem('offline_intakes') || '[]');
        let allCollections = [...collections, ...offlineIntakes];

        let settings = JSON.parse(localStorage.getItem('local_settings') || '${JSON.stringify(db.settings)}');

        return { farmers: allFarmers, collections: allCollections, settings };
    }

    function switchAdminTab(tabName) {
        currentAdminTab = tabName;
        ['Overview', 'Operations', 'Farmers', 'Reports', 'Management'].forEach(t => {
            let btn = document.getElementById('tabBtn' + t);
            if (btn) {
                if (t.toLowerCase() === tabName) {
                    btn.className = "px-4 py-2 rounded-xl text-sm font-semibold transition bg-emerald-700 text-white shadow";
                } else {
                    btn.className = "px-4 py-2 rounded-xl text-sm font-semibold transition bg-white text-slate-700 hover:bg-slate-100 border border-slate-200";
                }
            }
        });
        renderAdminTabContent();
    }

    function renderAdminTabContent() {
        let db = getLocalDB();
        let container = document.getElementById('adminTabContent');
        let totalFarmers = db.farmers.length;
        let totalLiters = db.collections.reduce((sum, c) => sum + parseFloat(c.liters || 0), 0);
        let totalValue = totalLiters * db.settings.pricePerLiter;

        if (currentAdminTab === 'overview') {
            let recent = [...db.collections].reverse().slice(0, 5);
            container.innerHTML = \`
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                        <div class="bg-emerald-100 text-emerald-700 p-4 rounded-xl text-xl"><i class="fa-solid fa-users"></i></div>
                        <div>
                            <p class="text-xs font-bold uppercase text-slate-500">Total Farmers</p>
                            <h3 class="text-2xl font-bold text-slate-800">\${totalFarmers}</h3>
                        </div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                        <div class="bg-blue-100 text-blue-700 p-4 rounded-xl text-xl"><i class="fa-solid fa-droplet"></i></div>
                        <div>
                            <p class="text-xs font-bold uppercase text-slate-500">Milk Collected</p>
                            <h3 class="text-2xl font-bold text-slate-800">\${totalLiters.toFixed(1)} <span class="text-sm font-normal">Ltrs</span></h3>
                        </div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                        <div class="bg-amber-100 text-amber-700 p-4 rounded-xl text-xl"><i class="fa-solid fa-money-bill-wave"></i></div>
                        <div>
                            <p class="text-xs font-bold uppercase text-slate-500">Total Value (TZS)</p>
                            <h3 class="text-2xl font-bold text-slate-800">\${totalValue.toLocaleString()}</h3>
                        </div>
                    </div>
                    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                        <div class="bg-purple-100 text-purple-700 p-4 rounded-xl text-xl"><i class="fa-solid fa-tag"></i></div>
                        <div>
                            <p class="text-xs font-bold uppercase text-slate-500">Price / Liter</p>
                            <h3 class="text-2xl font-bold text-slate-800">\${db.settings.pricePerLiter} TZS</h3>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 class="font-bold text-lg text-slate-800 mb-4"><i class="fa-solid fa-clock-rotate-left mr-2 text-emerald-700"></i>Recent Intakes</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold">
                                <tr>
                                    <th class="p-3">Date</th>
                                    <th class="p-3">Farmer</th>
                                    <th class="p-3">Shift</th>
                                    <th class="p-3">Liters</th>
                                    <th class="p-3">Payout (TZS)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                \${recent.map(c => {
                                    let f = db.farmers.find(x => x.farmerId === c.farmerId);
                                    let amt = parseFloat(c.liters) * db.settings.pricePerLiter;
                                    return \`<tr>
                                        <td class="p-3 font-mono text-xs">\${c.date}</td>
                                        <td class="p-3 font-medium">\${c.farmerId} - \${f ? f.name : 'Unknown'}</td>
                                        <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-semibold \${c.shift === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">\${c.shift}</span></td>
                                        <td class="p-3 font-bold text-emerald-700">\${c.liters} L</td>
                                        <td class="p-3 font-mono">\${amt.toLocaleString()}</td>
                                    </tr>\`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>\`;
        } else if (currentAdminTab === 'operations') {
            let farmerOpts = db.farmers.map(f => \`<option value="\${f.farmerId}">\${f.farmerId} - \${f.name}</option>\`).join('');
            let rows = db.collections.map(c => {
                let f = db.farmers.find(x => x.farmerId === c.farmerId);
                let amt = parseFloat(c.liters) * db.settings.pricePerLiter;
                return \`<tr class="hover:bg-slate-50">
                    <td class="p-3 font-mono text-xs">\${c.date}</td>
                    <td class="p-3 font-medium">\${c.farmerId} - \${f ? f.name : ''}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-semibold \${c.shift === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">\${c.shift}</span></td>
                    <td class="p-3 font-bold text-emerald-700">\${c.liters} L</td>
                    <td class="p-3 font-mono">\${amt.toLocaleString()}</td>
                </tr>\`;
            }).join('');

            container.innerHTML = \`
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 class="font-bold text-lg text-slate-800 mb-4"><i class="fa-solid fa-plus-circle text-emerald-700 mr-2"></i> New Milk Intake</h3>
                    <form onsubmit="handleNewIntake(event)" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Select Farmer</label>
                            <select id="intakeFarmer" required class="w-full p-2.5 border rounded-xl text-sm bg-white">
                                <option value="">-- Choose Farmer --</option>
                                \${farmerOpts}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Quantity (Liters)</label>
                            <input type="number" step="0.1" min="0.1" id="intakeLiters" required placeholder="25.5" class="w-full p-2.5 border rounded-xl text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Shift</label>
                            <select id="intakeShift" class="w-full p-2.5 border rounded-xl text-sm bg-white">
                                <option value="Morning">Morning Shift</option>
                                <option value="Evening">Evening Shift</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Date</label>
                            <input type="date" id="intakeDate" value="\${new Date().toISOString().split('T')[0]}" required class="w-full p-2.5 border rounded-xl text-sm">
                        </div>
                        <button type="submit" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition shadow text-sm">
                            Record Collection <i class="fa-solid fa-check ml-1"></i>
                        </button>
                    </form>
                </div>

                <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 class="font-bold text-lg text-slate-800 mb-4"><i class="fa-solid fa-list-check text-emerald-700 mr-2"></i> Collection Ledger</h3>
                    <div class="overflow-x-auto max-h-[450px] overflow-y-auto">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold sticky top-0">
                                <tr>
                                    <th class="p-3">Date</th>
                                    <th class="p-3">Farmer</th>
                                    <th class="p-3">Shift</th>
                                    <th class="p-3">Liters</th>
                                    <th class="p-3">Amount (TZS)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                \${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>\`;
        } else if (currentAdminTab === 'farmers') {
            let nextId = 'kmk' + String(db.farmers.length + 1).padStart(6, '0');
            let farmerRows = db.farmers.map(f => \`
                <tr class="hover:bg-slate-50">
                    <td class="p-3 font-mono font-bold text-emerald-700">\${f.farmerId}</td>
                    <td class="p-3 font-medium">\${f.name}</td>
                    <td class="p-3 font-mono text-xs">\${f.phone}</td>
                    <td class="p-3 font-mono font-bold bg-slate-100 px-2 rounded">\${f.passkey}</td>
                    <td class="p-3 text-slate-500">\${f.village || '-'}</td>
                </tr>
            \`).join('');

            container.innerHTML = \`
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 class="font-bold text-lg text-slate-800 mb-4"><i class="fa-solid fa-user-plus text-emerald-700 mr-2"></i> Register Farmer</h3>
                    <form onsubmit="handleNewFarmer(event)" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Farmer ID</label>
                            <input type="text" id="regFarmerId" value="\${nextId}" readonly class="w-full p-2.5 bg-slate-100 border rounded-xl text-sm font-mono font-bold text-emerald-800">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Full Name</label>
                            <input type="text" id="regName" required placeholder="Neema Juma" class="w-full p-2.5 border rounded-xl text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Phone Number</label>
                            <input type="text" id="regPhone" required placeholder="+255..." class="w-full p-2.5 border rounded-xl text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Village</label>
                            <input type="text" id="regVillage" placeholder="Kondiki Center" class="w-full p-2.5 border rounded-xl text-sm">
                        </div>
                        <button type="submit" class="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition shadow text-sm">
                            Register Farmer & Generate Passkey <i class="fa-solid fa-user-check ml-1"></i>
                        </button>
                    </form>
                </div>

                <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 class="font-bold text-lg text-slate-800 mb-4"><i class="fa-solid fa-address-book text-emerald-700 mr-2"></i> Farmers Directory</h3>
                    <div class="overflow-x-auto max-h-[450px] overflow-y-auto">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold sticky top-0">
                                <tr>
                                    <th class="p-3">ID</th>
                                    <th class="p-3">Name</th>
                                    <th class="p-3">Phone</th>
                                    <th class="p-3">Passkey</th>
                                    <th class="p-3">Village</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                \${farmerRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>\`;
        } else if (currentAdminTab === 'reports') {
            container.innerHTML = \`
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-xl text-slate-800"><i class="fa-solid fa-chart-pie text-emerald-700 mr-2"></i> Financial Reports</h3>
                        <p class="text-sm text-slate-500 mt-1">Calculated locally and synced with cloud.</p>
                    </div>
                    <button onclick="window.print()" class="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow"><i class="fa-solid fa-print mr-1"></i> Print</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-emerald-700 text-white p-6 rounded-2xl">
                        <p class="text-xs uppercase font-bold text-emerald-200">Total Volume</p>
                        <h3 class="text-3xl font-extrabold mt-1">\${totalLiters.toFixed(1)} Liters</h3>
                    </div>
                    <div class="bg-teal-700 text-white p-6 rounded-2xl">
                        <p class="text-xs uppercase font-bold text-teal-200">Total Payout Liability</p>
                        <h3 class="text-3xl font-extrabold mt-1">\${totalValue.toLocaleString()} TZS</h3>
                    </div>
                    <div class="bg-slate-800 text-white p-6 rounded-2xl">
                        <p class="text-xs uppercase font-bold text-slate-400">Unit Price</p>
                        <h3 class="text-3xl font-extrabold mt-1">\${db.settings.pricePerLiter} TZS</h3>
                    </div>
                </div>
            </div>\`;
        } else if (currentAdminTab === 'management') {
            container.innerHTML = \`
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-xl">
                <h3 class="font-bold text-lg text-slate-800 mb-4"><i class="fa-solid fa-gear text-emerald-700 mr-2"></i> Settings</h3>
                <form onsubmit="handleSaveSettings(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Price Per Liter (TZS)</label>
                        <input type="number" id="setPrice" value="\${db.settings.pricePerLiter}" required class="w-full p-2.5 border rounded-xl text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-slate-600 mb-1">Center Name</label>
                        <input type="text" id="setCenter" value="\${db.settings.collectionCenter}" required class="w-full p-2.5 border rounded-xl text-sm">
                    </div>
                    <button type="submit" class="bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow">Save Settings</button>
                </form>
            </div>\`;
        }
    }

    function handleNewIntake(e) {
        e.preventDefault();
        let record = {
            farmerId: document.getElementById('intakeFarmer').value,
            liters: document.getElementById('intakeLiters').value,
            shift: document.getElementById('intakeShift').value,
            date: document.getElementById('intakeDate').value,
            recordedBy: 'admin',
            timestamp: Date.now()
        };

        let queue = JSON.parse(localStorage.getItem('offline_intakes') || '[]');
        queue.push(record);
        localStorage.setItem('offline_intakes', JSON.stringify(queue));

        alert('Milk collection recorded successfully (Offline Queue Active)!');
        document.getElementById('intakeLiters').value = '';
        renderAdminTabContent();
        if (navigator.onLine) syncWithCloud();
    }

    function handleNewFarmer(e) {
        e.preventDefault();
        let passkey = Math.floor(1000 + Math.random() * 9000).toString();
        let farmer = {
            farmerId: document.getElementById('regFarmerId').value,
            name: document.getElementById('regName').value,
            phone: document.getElementById('regPhone').value,
            village: document.getElementById('regVillage').value || 'Kondiki',
            passkey: passkey,
            registeredDate: new Date().toISOString()
        };

        let offlineFarmers = JSON.parse(localStorage.getItem('offline_farmers') || '[]');
        offlineFarmers.push(farmer);
        localStorage.setItem('offline_farmers', JSON.stringify(offlineFarmers));

        alert('Farmer registered successfully! Generated 4-digit Passkey: ' + passkey);
        renderAdminTabContent();
        if (navigator.onLine) syncWithCloud();
    }

    function handleSaveSettings(e) {
        e.preventDefault();
        let settings = {
            pricePerLiter: parseFloat(document.getElementById('setPrice').value),
            collectionCenter: document.getElementById('setCenter').value
        };
        localStorage.setItem('local_settings', JSON.stringify(settings));
        alert('Settings saved locally.');
        renderAdminTabContent();
    }

    renderAdminTabContent();
    </script>
    `;

    let user = { username: 'admin', role: 'SuperAdmin', name: 'System Super Admin' };
    res.send(renderLayout('Admin Dashboard', content, user));
});

// ==========================================
// FARMER DASHBOARD ROUTE
// ==========================================
app.get('/farmer/dashboard', (req, res) => {
    let content = `
    <div id="farmerContainer" class="space-y-6">
        Loading farmer portal...
    </div>
    <script>
        let currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
        let farmers = JSON.parse(localStorage.getItem('local_db_farmers') || '${JSON.stringify(db.farmers)}');
        let offlineFarmers = JSON.parse(localStorage.getItem('offline_farmers') || '[]');
        let allFarmers = [...farmers, ...offlineFarmers];
        let farmer = allFarmers.find(f => f.farmerId === currentUser.farmerId) || allFarmers[0];

        let collections = JSON.parse(localStorage.getItem('local_db_collections') || '${JSON.stringify(db.collections)}');
        let offlineIntakes = JSON.parse(localStorage.getItem('offline_intakes') || '[]');
        let allCollections = [...collections, ...offlineIntakes];
        let fCollections = allCollections.filter(c => c.farmerId === farmer.farmerId);

        let settings = JSON.parse(localStorage.getItem('local_settings') || '${JSON.stringify(db.settings)}');
        let totalLiters = fCollections.reduce((sum, c) => sum + parseFloat(c.liters || 0), 0);
        let totalEarnings = totalLiters * settings.pricePerLiter;

        document.getElementById('farmerContainer').innerHTML = \`
        <div class="space-y-6">
            <div class="bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-6 rounded-2xl shadow-md flex justify-between items-center">
                <div>
                    <span class="bg-teal-900/60 text-teal-200 px-3 py-1 rounded-full text-xs font-mono font-semibold border border-teal-600">ID: \${farmer.farmerId}</span>
                    <h2 class="text-2xl font-bold mt-2">Welcome, \${farmer.name}!</h2>
                    <p class="text-teal-100 text-sm mt-0.5"><i class="fa-solid fa-location-dot mr-1"></i> Village: \${farmer.village || 'Kondiki'} &bull; Phone: \${farmer.phone}</p>
                </div>
                <div class="bg-white/10 p-4 rounded-xl text-right">
                    <p class="text-xs text-teal-200 uppercase font-bold">Price / Liter</p>
                    <h3 class="text-xl font-mono font-bold">\${settings.pricePerLiter} TZS</h3>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div class="bg-emerald-100 text-emerald-700 p-4 rounded-xl text-2xl"><i class="fa-solid fa-droplet"></i></div>
                    <div>
                        <p class="text-xs font-bold uppercase text-slate-500">Your Total Milk Delivered</p>
                        <h3 class="text-3xl font-extrabold text-slate-800">\${totalLiters.toFixed(1)} <span class="text-base font-normal">Liters</span></h3>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4">
                    <div class="bg-amber-100 text-amber-700 p-4 rounded-xl text-2xl"><i class="fa-solid fa-money-bill-wave"></i></div>
                    <div>
                        <p class="text-xs font-bold uppercase text-slate-500">Your Cumulative Earnings</p>
                        <h3 class="text-3xl font-extrabold text-slate-800">\${totalEarnings.toLocaleString()} <span class="text-base font-normal">TZS</span></h3>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 class="font-bold text-lg text-slate-800 mb-4"><i class="fa-solid fa-clock-rotate-left text-teal-700 mr-2"></i> Delivery History</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold">
                            <tr>
                                <th class="p-3">Date</th>
                                <th class="p-3">Shift</th>
                                <th class="p-3">Quantity (Liters)</th>
                                <th class="p-3">Payout (TZS)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            \${fCollections.length === 0 ? \`<tr><td colspan="4" class="p-6 text-center text-slate-400">No deliveries recorded yet.</td></tr>\` : fCollections.map(c => \`
                            <tr class="hover:bg-slate-50">
                                <td class="p-3 font-mono text-xs">\${c.date}</td>
                                <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-semibold \${c.shift === 'Morning' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}">\${c.shift}</span></td>
                                <td class="p-3 font-bold text-emerald-700">\${c.liters} L</td>
                                <td class="p-3 font-mono">\${(parseFloat(c.liters) * settings.pricePerLiter).toLocaleString()}</td>
                            </tr>\`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>\`;
    </script>
    `;

    res.send(renderLayout('Farmer Dashboard', content, { name: 'Farmer Portal', role: 'Farmer' }));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Kondiki Hybrid Offline-Sync System running on port ${PORT}`);
});
