const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.get('*', (req, res) => {
    res.send(
        '<!DOCTYPE html>\n' +
        '<html lang="en" class="dark">\n' +
        '<head>\n' +
        '    <meta charset="UTF-8">\n' +
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '    <title>Kondiki SACCOS - Milk Collection System</title>\n' +
        '    <script src="https://cdn.tailwindcss.com"></script>\n' +
        '    <script>\n' +
        '        tailwind.config = {\n' +
        '            darkMode: "class",\n' +
        '            theme: { extend: { colors: { brand: { 50: "#f0fdf4", 500: "#22c55e", 600: "#16a34a", 700: "#15803d" } } } }\n' +
        '        }\n' +
        '    </script>\n' +
        '</head>\n' +
        '<body class="bg-slate-950 text-slate-100 min-h-screen font-sans">\n' +
        '    <div id="app" class="max-w-4xl mx-auto p-4">\n' +
        '        <header class="flex justify-between items-center py-4 border-b border-slate-800 mb-6">\n' +
        '            <div>\n' +
        '                <h1 class="text-2xl font-bold text-emerald-400 flex items-center gap-2">\n' +
        '                    🥛 Kondiki Milk Collection\n' +
        '                </h1>\n' +
        '                <p class="text-xs text-slate-400" id="network-status">🟢 Online Mode (Synced)</p>\n' +
        '            </div>\n' +
        '            <div class="flex items-center gap-3">\n' +
        '                <button onclick="toggleLanguage()" id="lang-btn" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-700">SW / EN</button>\n' +
        '                <button onclick="switchRole(\'admin\')" id="btn-admin" class="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded">Admin</button>\n' +
        '                <button onclick="switchRole(\'farmer\')" id="btn-farmer" class="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded">Farmer</button>\n' +
        '            </div>\n' +
        '        </header>\n' +
        '\n' +
        '        <!-- ADMIN VIEW -->\n' +
        '        <div id="view-admin" class="space-y-6">\n' +
        '            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">\n' +
        '                <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">\n' +
        '                    <p class="text-xs text-slate-400">Total Liters Today</p>\n' +
        '                    <p class="text-xl font-bold text-emerald-400" id="stat-liters">0 L</p>\n' +
        '                </div>\n' +
        '                <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">\n' +
        '                    <p class="text-xs text-slate-400">Total Payout (TZS)</p>\n' +
        '                    <p class="text-xl font-bold text-blue-400" id="stat-payout">0 TZS</p>\n' +
        '                </div>\n' +
        '                <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">\n' +
        '                    <p class="text-xs text-slate-400">Registered Farmers</p>\n' +
        '                    <p class="text-xl font-bold text-purple-400" id="stat-farmers">0</p>\n' +
        '                </div>\n' +
        '                <div class="bg-slate-900 p-4 rounded-xl border border-slate-800">\n' +
        '                    <p class="text-xs text-slate-400">Offline Queue</p>\n' +
        '                    <p class="text-xl font-bold text-amber-400" id="stat-queue">0 items</p>\n' +
        '                </div>\n' +
        '            </div>\n' +
        '\n' +
        '            <!-- Quick Record Intake Form -->\n' +
        '            <div class="bg-slate-900 p-5 rounded-xl border border-slate-800">\n' +
        '                <h2 class="text-lg font-semibold mb-4 text-emerald-400">Record Milk Intake</h2>\n' +
        '                <form id="intake-form" onsubmit="handleIntakeSubmit(event)" class="grid grid-cols-1 md:grid-cols-3 gap-4">\n' +
        '                    <div>\n' +
        '                        <label class="block text-xs text-slate-400 mb-1">Select Farmer</label>\n' +
        '                        <select id="intake-farmer" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200" required></select>\n' +
        '                    </div>\n' +
        '                    <div>\n' +
        '                        <label class="block text-xs text-slate-400 mb-1">Quantity (Liters)</label>\n' +
        '                        <input type="number" step="0.1" id="intake-liters" placeholder="e.g. 15.5" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200" required />\n' +
        '                    </div>\n' +
        '                    <div>\n' +
        '                        <label class="block text-xs text-slate-400 mb-1">Shift</label>\n' +
        '                        <select id="intake-shift" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200">\n' +
        '                            <option value="Morning">Morning (Asubuhi)</option>\n' +
        '                            <option value="Evening">Evening (Jioni)</option>\n' +
        '                        </select>\n' +
        '                    </div>\n' +
        '                    <div class="md:col-span-3 flex justify-end gap-3">\n' +
        '                        <button type="button" onclick="triggerSync()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-700">Force Sync Now</button>\n' +
        '                        <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white rounded text-sm">Save Intake (Offline-First)</button>\n' +
        '                    </div>\n' +
        '                </form>\n' +
        '            </div>\n' +
        '\n' +
        '            <!-- Recent Intakes Table -->\n' +
        '            <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 overflow-x-auto">\n' +
        '                <h2 class="text-lg font-semibold mb-4 text-slate-200">Recent Collections Ledger</h2>\n' +
        '                <table class="w-full text-left text-sm">\n' +
        '                    <thead>\n' +
        '                        <tr class="border-b border-slate-800 text-slate-400">\n' +
        '                            <th class="pb-2">Date / Shift</th>\n' +
        '                            <th class="pb-2">Farmer</th>\n' +
        '                            <th class="pb-2">Liters</th>\n' +
        '                            <th class="pb-2">Total (TZS)</th>\n' +
        '                            <th class="pb-2">Status</th>\n' +
        '                        </tr>\n' +
        '                    </thead>\n' +
        '                    <tbody id="intakes-table-body"></tbody>\n' +
        '                </table>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '\n' +
        '        <!-- FARMER VIEW -->\n' +
        '        <div id="view-farmer" class="hidden space-y-6">\n' +
        '            <div class="bg-slate-900 p-5 rounded-xl border border-slate-800">\n' +
        '                <h2 class="text-lg font-semibold mb-3 text-emerald-400">Farmer Portal</h2>\n' +
        '                <label class="block text-xs text-slate-400 mb-1">Select Your Profile</label>\n' +
        '                <select id="portal-farmer-select" onchange="renderFarmerPortal()" class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 mb-4"></select>\n' +
        '                <div id="farmer-summary-card" class="bg-slate-950 p-4 rounded border border-slate-800"></div>\n' +
        '            </div>\n' +
        '        </div>\n' +
        '    </div>\n' +
        '\n' +
        '    <script>\n' +
        '        var currentRole = "admin";\n' +
        '        var currentLang = "en";\n' +
        '        var state = { farmers: [], milkIntakes: [], settings: { pricePerLiter: 1200 } };\n' +
        '\n' +
        '        function getOfflineQueue() {\n' +
        '            return JSON.parse(localStorage.getItem("kondiki_offline_queue") || "[]");\n' +
        '        }\n' +
        '\n' +
        '        function saveOfflineQueue(queue) {\n' +
        '            localStorage.setItem("kondiki_offline_queue", JSON.stringify(queue));\n' +
        '            document.getElementById("stat-queue").innerText = queue.length + " items";\n' +
        '        }\n' +
        '\n' +
        '        async function fetchState() {\n' +
        '            try {\n' +
        '                var res = await fetch("/api/state");\n' +
        '                var data = await res.json();\n' +
        '                state = data;\n' +
        '                var queue = getOfflineQueue();\n' +
        '                if (queue.length > 0) {\n' +
        '                    state.milkIntakes = queue.concat(state.milkIntakes);\n' +
        '                }\n' +
        '                renderApp();\n' +
        '                document.getElementById("network-status").innerText = "🟢 Online Mode (Synced)";\n' +
        '            } catch (err) {\n' +
        '                console.warn("Offline mode active:", err);\n' +
        '                document.getElementById("network-status").innerText = "🟠 Offline Mode (Using LocalStorage)";\n' +
        '                var localState = JSON.parse(localStorage.getItem("kondiki_state") || \'{"farmers":[], "milkIntakes":[]}\');\n' +
        '                var queue = getOfflineQueue();\n' +
        '                state.farmers = localState.farmers && localState.farmers.length ? localState.farmers : [\n' +
        '                    { id: "F001", name: "Juma Hassan", village: "Kondiki A" },\n' +
        '                    { id: "F002", name: "Amina Mwalimu", village: "Kondiki B" }\n' +
        '                ];\n' +
        '                state.milkIntakes = queue.concat(localState.milkIntakes || []);\n' +
        '                renderApp();\n' +
        '            }\n' +
        '        }\n' +
        '\n' +
        '        function renderApp() {\n' +
        '            localStorage.setItem("kondiki_state", JSON.stringify(state));\n' +
        '            \n' +
        '            var totalLiters = state.milkIntakes.reduce(function(sum, i) { return sum + parseFloat(i.liters || 0); }, 0);\n' +
        '            var totalPayout = state.milkIntakes.reduce(function(sum, i) { return sum + parseFloat(i.totalAmount || 0); }, 0);\n' +
        '            document.getElementById("stat-liters").innerText = totalLiters.toFixed(1) + " L";\n' +
        '            document.getElementById("stat-payout").innerText = totalPayout.toLocaleString() + " TZS";\n' +
        '            document.getElementById("stat-farmers").innerText = state.farmers.length;\n' +
        '            document.getElementById("stat-queue").innerText = getOfflineQueue().length + " items";\n' +
        '\n' +
        '            var farmerOpts = state.farmers.map(function(f) {\n' +
        '                return \'<option value="\' + f.id + \'">\' + f.name + \' (\' + (f.village || "") + \')</option>\';\n' +
        '            }).join("");\n' +
        '            document.getElementById("intake-farmer").innerHTML = farmerOpts;\n' +
        '            document.getElementById("portal-farmer-select").innerHTML = farmerOpts;\n' +
        '\n' +
        '            var tableRows = state.milkIntakes.map(function(i) {\n' +
        '                var statusClass = i.synced ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800";\n' +
        '                var statusText = i.synced ? "Synced" : "Pending";\n' +
        '                return \'<tr class="border-b border-slate-900">\\\n' +
        '                    <td class="py-2 text-slate-300">\' + i.date + \' <span class="text-xs text-slate-500">(\' + i.shift + \')</span></td>\\\n' +
        '                    <td class="py-2 font-medium text-slate-200">\' + (i.farmerName || i.farmerId) + \'</td>\\\n' +
        '                    <td class="py-2 text-emerald-400 font-semibold">\' + i.liters + \' L</td>\\\n' +
        '                    <td class="py-2 text-blue-400">\' + (i.totalAmount || (i.liters * 1200)).toLocaleString() + \' TZS</td>\\\n' +
        '                    <td class="py-2"><span class="px-2 py-0.5 text-xs rounded \' + statusClass + \'">\' + statusText + \'</span></td>\\\n' +
        '                </tr>\';\n' +
        '            }).join("");\n' +
        '            document.getElementById("intakes-table-body").innerHTML = tableRows;\n' +
        '            renderFarmerPortal();\n' +
        '        }\n' +
        '\n' +
        '        async function handleIntakeSubmit(e) {\n' +
        '            e.preventDefault();\n' +
        '            var farmerId = document.getElementById("intake-farmer").value;\n' +
        '            var liters = parseFloat(document.getElementById("intake-liters").value);\n' +
        '            var shift = document.getElementById("intake-shift").value;\n' +
        '            var farmer = state.farmers.find(function(f) { return f.id === farmerId; });\n' +
        '\n' +
        '            var newIntake = {\n' +
        '                id: "M" + Date.now(),\n' +
        '                farmerId: farmerId,\n' +
        '                farmerName: farmer ? farmer.name : farmerId,\n' +
        '                liters: liters,\n' +
        '                shift: shift,\n' +
        '                pricePerLiter: 1200,\n' +
        '                totalAmount: liters * 1200,\n' +
        '                date: new Date().toISOString().split("T")[0],\n' +
        '                synced: false\n' +
        '            };\n' +
        '\n' +
        '            if (navigator.onLine) {\n' +
        '                try {\n' +
        '                    var res = await fetch("/api/intake", {\n' +
        '                        method: "POST",\n' +
        '                        headers: { "Content-Type": "application/json" },\n' +
        '                        body: JSON.stringify({ farmerId: farmerId, liters: liters, shift: shift })\n' +
        '                    });\n' +
        '                    if (res.ok) {\n' +
        '                        newIntake.synced = true;\n' +
        '                    }\n' +
        '                } catch (err) {\n' +
        '                    console.warn("Server unreachable, queueing offline.");\n' +
        '                }\n' +
        '            }\n' +
        '\n' +
        '            if (!newIntake.synced) {\n' +
        '                var queue = getOfflineQueue();\n' +
        '                queue.push(newIntake);\n' +
        '                saveOfflineQueue(queue);\n' +
        '            }\n' +
        '\n' +
        '            state.milkIntakes.unshift(newIntake);\n' +
        '            renderApp();\n' +
        '            document.getElementById("intake-liters").value = "";\n' +
        '            alert("Milk intake recorded successfully!");\n' +
        '        }\n' +
        '\n' +
        '        async function triggerSync() {\n' +
        '            var queue = getOfflineQueue();\n' +
        '            if (queue.length === 0) {\n' +
        '                alert("No offline items to sync.");\n' +
        '                return;\n' +
        '            }\n' +
        '            try {\n' +
        '                var res = await fetch("/api/sync-upload", {\n' +
        '                    method: "POST",\n' +
        '                    headers: { "Content-Type": "application/json" },\n' +
        '                    body: JSON.stringify({ offlineIntakes: queue })\n' +
        '                });\n' +
        '                if (res.ok) {\n' +
        '                    localStorage.removeItem("kondiki_offline_queue");\n' +
        '                    alert("Sync completed successfully with server!");\n' +
        '                    fetchState();\n' +
        '                }\n' +
        '            } catch (err) {\n' +
        '                alert("Sync failed: Network offline.");\n' +
        '            }\n' +
        '        }\n' +
        '\n' +
        '        function switchRole(role) {\n' +
        '            currentRole = role;\n' +
        '            if (role === "admin") {\n' +
        '                document.getElementById("view-admin").classList.remove("hidden");\n' +
        '                document.getElementById("view-farmer").classList.add("hidden");\n' +
        '                document.getElementById("btn-admin").className = "px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded";\n' +
        '                document.getElementById("btn-farmer").className = "px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded";\n' +
        '            } else {\n' +
        '                document.getElementById("view-admin").classList.add("hidden");\n' +
        '                document.getElementById("view-farmer").classList.remove("hidden");\n' +
        '                document.getElementById("btn-farmer").className = "px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded";\n' +
        '                document.getElementById("btn-admin").className = "px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded";\n' +
        '                renderFarmerPortal();\n' +
        '            }\n' +
        '        }\n' +
        '\n' +
        '        function renderFarmerPortal() {\n' +
        '            var selectedFarmerId = document.getElementById("portal-farmer-select").value;\n' +
        '            var farmerIntakes = state.milkIntakes.filter(function(i) { return i.farmerId === selectedFarmerId; });\n' +
        '            var totalLiters = farmerIntakes.reduce(function(sum, i) { return sum + parseFloat(i.liters || 0); }, 0);\n' +
        '            var totalEarnings = farmerIntakes.reduce(function(sum, i) { return sum + parseFloat(i.totalAmount || 0); }, 0);\n' +
        '\n' +
        '            document.getElementById("farmer-summary-card").innerHTML = \'<div class="space-y-3">\\\n' +
        '                <div class="flex justify-between border-b border-slate-800 pb-2">\\\n' +
        '                    <span class="text-slate-400 text-xs">Total Milk Delivered:</span>\\\n' +
        '                    <span class="font-bold text-emerald-400">\' + totalLiters.toFixed(1) + \' Liters</span>\\\n' +
        '                </div>\\\n' +
        '                <div class="flex justify-between border-b border-slate-800 pb-2">\\\n' +
        '                    <span class="text-slate-400 text-xs">Total Cumulative Earnings:</span>\\\n' +
        '                    <span class="font-bold text-blue-400">\' + totalEarnings.toLocaleString() + \' TZS</span>\\\n' +
        '                </div>\\\n' +
        '                <p class="text-xs text-slate-500 pt-1">Deliveries logged: \' + farmerIntakes.length + \'</p>\\\n' +
        '            </div>\';\n' +
        '        }\n' +
        '\n' +
        '        window.onload = fetchState;\n' +
        '    </script>\n' +
        '</body>\n' +
        '</html>'
    );
});

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});
