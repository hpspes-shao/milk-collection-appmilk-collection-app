const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables.');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== API BACKEND ROUTES ====================

// Get all farmers
app.get('/api/farmers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('farmers')
      .select('*')
      .order('farmer_id', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create farmer (sequential ID + random passkey)
app.post('/api/farmers', async (req, res) => {
  try {
    const { name, phone, zone } = req.body;

    const { data: existing, error: fetchError } = await supabase
      .from('farmers')
      .select('farmer_id')
      .like('farmer_id', 'kmk%')
      .order('farmer_id', { ascending: false })
      .limit(50);

    if (fetchError) throw fetchError;

    let nextNumber = 1;
    if (existing && existing.length > 0) {
      let maxNum = 0;
      existing.forEach(row => {
        const match = (row.farmer_id || '').match(/kmk(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      nextNumber = maxNum + 1;
    }

    const farmer_id = `kmk${String(nextNumber).padStart(5, '0')}`;
    const passkey = String(Math.floor(1000 + Math.random() * 9000));

    const { data, error } = await supabase
      .from('farmers')
      .insert([{ farmer_id, name, phone, zone, passkey }])
      .select();

    if (error) throw error;
    res.json({ success: true, farmer: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update farmer
app.put('/api/farmers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, zone, passkey } = req.body;

    const { data, error } = await supabase
      .from('farmers')
      .update({ name, phone, zone, passkey })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, farmer: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete farmer
app.delete('/api/farmers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('farmers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get collections (with farmer info)
app.get('/api/collections', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*, farmers(name, zone, farmer_id)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create collection intake
app.post('/api/collections', async (req, res) => {
  try {
    const { farmer_id, litres, fat, notes } = req.body;
    const { data, error } = await supabase
      .from('collections')
      .insert([{ farmer_id, litres, fat, notes }])
      .select();

    if (error) throw error;
    res.json({ success: true, collection: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get/Set settings (Price per litre)
app.get('/api/settings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('*').limit(1);
    if (error) throw error;
    res.json(data && data.length > 0 ? data[0] : { price_per_litre: 1000 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { price_per_litre } = req.body;
    // Assuming a single settings row update or upsert
    const { data, error } = await supabase
      .from('settings')
      .upsert({ id: 1, price_per_litre })
      .select();
    if (error) throw error;
    res.json({ success: true, settings: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== MAIN APPLICATION ROUTE ====================
app.get('*', async (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milk Collection Hub & Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
</head>
<body id="appBody" class="bg-gray-950 text-gray-100 min-h-screen flex flex-col font-sans antialiased pb-20 transition-colors duration-200">

  <!-- TOP HEADER -->
  <header id="appHeader" class="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex justify-between items-center shadow-lg">
    <div class="flex items-center space-x-3 cursor-pointer" onclick="goHome()">
      <div class="bg-blue-600 p-2.5 rounded-xl text-white shadow-md">
        <i class="fa-solid fa-bucket text-lg"></i>
      </div>
      <div>
        <h1 class="text-base sm:text-lg font-bold tracking-wide hover:text-blue-400 transition">Milk Collection Hub</h1>
        <p class="text-[11px] text-gray-400">Management & Admin Portal</p>
      </div>
    </div>
    <div class="flex items-center space-x-2">
      <!-- Admin Action Quick Buttons -->
      <div id="adminHeaderActions" class="hidden sm:flex items-center space-x-2">
        <button type="button" onclick="openModal('farmerModal')" class="bg-gray-800 hover:bg-gray-700 text-blue-400 border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5">
          <i class="fa-solid fa-user-plus"></i> New Farmer
        </button>
        <button type="button" onclick="openModal('intakeModal')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow">
          <i class="fa-solid fa-plus"></i> Log Intake
        </button>
      </div>
      <button type="button" onclick="toggleTheme()" class="bg-gray-800 hover:bg-gray-700 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-gray-700 cursor-pointer flex items-center gap-1.5">
        <i id="themeIcon" class="fa-solid fa-sun"></i>
      </button>
      <button type="button" onclick="switchView('publicHome')" id="farmerPortalBtn" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-gray-700 cursor-pointer flex items-center gap-1.5">
        <i class="fa-solid fa-user text-emerald-400"></i> Portal
      </button>
      <button type="button" onclick="switchView('staffLogin')" id="staffLoginNavBtn" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow cursor-pointer flex items-center gap-1.5">
        <i class="fa-solid fa-lock"></i> Staff Login
      </button>
      <button type="button" id="headerLogoutBtn" onclick="handleLogout()" class="hidden bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow cursor-pointer flex items-center gap-1.5">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

    <!-- VIEW 1: FARMER PORTAL LOGIN -->
    <section id="view-publicHome" class="space-y-6">
      <div class="max-w-md mx-auto border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5 bg-gray-900 mt-10">
        <div class="text-center space-y-1">
          <div class="inline-block bg-emerald-500/10 text-emerald-400 p-3 rounded-full mb-1">
            <i class="fa-solid fa-id-card text-2xl"></i>
          </div>
          <h2 class="text-lg font-bold">Farmer Contribution Portal</h2>
          <p class="text-xs text-gray-400">Enter your Farmer ID and 4-digit Passkey.</p>
        </div>
        <form onsubmit="handleFarmerLogin(event)" class="space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Farmer Registration ID</label>
            <input type="text" id="loginFarmerId" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm uppercase focus:outline-none focus:border-emerald-500" placeholder="e.g. kmk00001">
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">4-Digit Passkey PIN</label>
            <input type="password" maxlength="4" id="loginPasskey" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm tracking-widest focus:outline-none focus:border-emerald-500" placeholder="••••">
          </div>
          <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-xs transition cursor-pointer shadow">View My Contributions</button>
        </form>
      </div>
    </section>

    <!-- VIEW 2: STAFF LOGIN -->
    <section id="view-staffLogin" class="hidden space-y-6">
      <div class="max-w-md mx-auto border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5 bg-gray-900 mt-10">
        <div class="text-center space-y-1">
          <div class="inline-block bg-blue-500/10 text-blue-400 p-3 rounded-full mb-1">
            <i class="fa-solid fa-shield-halved text-2xl"></i>
          </div>
          <h2 class="text-lg font-bold">Staff Authentication</h2>
          <p class="text-xs text-gray-400">Default: admin / admin123</p>
        </div>
        <form onsubmit="handleStaffLogin(event)" class="space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Username</label>
            <input type="text" id="staffUsername" required value="admin" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Password</label>
            <input type="password" id="staffPassword" required value="admin123" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
          </div>
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-xs transition cursor-pointer shadow">Login to Management</button>
        </form>
      </div>
    </section>

    <!-- VIEW 3: MANAGEMENT PORTAL -->
    <section id="view-managementPortal" class="hidden space-y-6">
      
      <!-- Mobile Quick Action Buttons Bar -->
      <div class="flex sm:hidden gap-2">
        <button type="button" onclick="openModal('farmerModal')" class="flex-1 bg-gray-800 hover:bg-gray-700 text-blue-400 border border-gray-700 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-user-plus"></i> New Farmer
        </button>
        <button type="button" onclick="openModal('intakeModal')" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow">
          <i class="fa-solid fa-plus"></i> Log Intake
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex overflow-x-auto gap-2 border-b border-gray-800 pb-2 scrollbar-none">
        <button id="tabDashboard" onclick="switchAdminTab('dashboard')" class="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white flex items-center gap-2 shrink-0 cursor-pointer">
          <i class="fa-solid fa-chart-pie"></i> Dashboard
        </button>
        <button id="tabFarmers" onclick="switchAdminTab('farmers')" class="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center gap-2 shrink-0 cursor-pointer">
          <i class="fa-solid fa-users"></i> Farmers Directory
        </button>
        <button id="tabIntakes" onclick="switchAdminTab('intakes')" class="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center gap-2 shrink-0 cursor-pointer">
          <i class="fa-solid fa-clipboard-list"></i> All Intakes
        </button>
        <button id="tabSettings" onclick="switchAdminTab('settings')" class="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center gap-2 shrink-0 cursor-pointer">
          <i class="fa-solid fa-shield-halved"></i> Admin & Settings
        </button>
      </div>

      <!-- ==================== TAB 1: DASHBOARD ==================== -->
      <div id="adminTab-dashboard" class="space-y-6">
        <!-- Metric Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Card 1: Registered Farmers -->
          <div class="border border-gray-800 bg-gray-900 p-5 rounded-2xl flex justify-between items-center shadow">
            <div class="space-y-1">
              <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Registered Farmers</p>
              <h3 id="statTotalFarmers" class="text-2xl font-black text-white">--</h3>
            </div>
            <div class="bg-blue-600/10 text-blue-400 p-3.5 rounded-xl border border-blue-500/20">
              <i class="fa-solid fa-users text-xl"></i>
            </div>
          </div>
          <!-- Card 2: Total Milk Intake -->
          <div class="border border-gray-800 bg-gray-900 p-5 rounded-2xl flex justify-between items-center shadow">
            <div class="space-y-1">
              <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Milk Intake</p>
              <h3 id="statTotalLitres" class="text-2xl font-black text-white">-- L</h3>
            </div>
            <div class="bg-emerald-600/10 text-emerald-400 p-3.5 rounded-xl border border-emerald-500/20">
              <i class="fa-solid fa-bucket text-xl"></i>
            </div>
          </div>
          <!-- Card 3: Current Price / Litre -->
          <div class="border border-gray-800 bg-gray-900 p-5 rounded-2xl flex justify-between items-center shadow">
            <div class="space-y-1">
              <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Current Price / Litre</p>
              <h3 id="statPricePerLitre" class="text-2xl font-black text-white">-- Tsh</h3>
            </div>
            <div class="bg-purple-600/10 text-purple-400 p-3.5 rounded-xl border border-purple-500/20">
              <i class="fa-solid fa-coins text-xl"></i>
            </div>
          </div>
        </div>

        <!-- Recent Intakes Table Section -->
        <div class="border border-gray-800 rounded-2xl p-5 bg-gray-900 shadow space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-bold flex items-center gap-2">
              <i class="fa-solid fa-clock-rotate-left text-blue-400"></i> Recent Intakes
            </h3>
            <button onclick="loadCollectionsData()" class="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer border border-gray-700">
              <i class="fa-solid fa-rotate"></i> Refresh
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-800 text-gray-400 uppercase">
                <tr>
                  <th class="p-3">Farmer</th>
                  <th class="p-3">Zone</th>
                  <th class="p-3">Volume (L)</th>
                  <th class="p-3">Fat %</th>
                  <th class="p-3">Total (Tsh)</th>
                  <th class="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody id="dashboardRecentTableBody" class="divide-y divide-gray-800">
                <tr><td colspan="6" class="p-4 text-center text-gray-500">Loading collection logs...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 2: FARMERS DIRECTORY ==================== -->
      <div id="adminTab-farmers" class="hidden space-y-4">
        <div class="border border-gray-800 rounded-2xl p-5 bg-gray-900 shadow">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h3 class="text-sm font-bold">Registered Farmers Directory</h3>
            <div class="flex gap-2 w-full sm:w-auto">
              <input type="text" id="farmerSearch" oninput="filterFarmers()" placeholder="Search name / ID / zone..." class="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs w-full sm:w-48 focus:outline-none focus:border-blue-500">
              <button onclick="openModal('farmerModal')" class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold shrink-0">
                <i class="fa-solid fa-user-plus"></i> New
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-800 text-gray-400 uppercase">
                <tr>
                  <th class="p-3">ID</th>
                  <th class="p-3">Name</th>
                  <th class="p-3">Phone</th>
                  <th class="p-3">Zone</th>
                  <th class="p-3">Passkey</th>
                  <th class="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody id="farmersTableBody" class="divide-y divide-gray-800">
                <tr><td colspan="6" class="p-4 text-center text-gray-500">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 3: ALL INTAKES / REPORTS ==================== -->
      <div id="adminTab-intakes" class="hidden space-y-4">
        <div class="border border-gray-800 rounded-2xl p-5 bg-gray-900 shadow space-y-4">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 class="text-sm font-bold">All Collection Intakes</h3>
            <div class="flex flex-wrap gap-2 w-full sm:w-auto">
              <input type="text" id="reportSearch" oninput="filterReports()" placeholder="Search Farmer ID / Name..." class="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs w-full sm:w-48 focus:outline-none focus:border-blue-500">
              <button onclick="exportReport('csv')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold">
                <i class="fa-solid fa-file-csv"></i> CSV
              </button>
              <button onclick="exportReport('excel')" class="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold">
                <i class="fa-solid fa-file-excel"></i> Excel
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-800 text-gray-400 uppercase">
                <tr>
                  <th class="p-3">Date</th>
                  <th class="p-3">Farmer ID</th>
                  <th class="p-3">Name</th>
                  <th class="p-3">Zone</th>
                  <th class="p-3">Litres</th>
                  <th class="p-3">Fat %</th>
                  <th class="p-3">Total (Tsh)</th>
                  <th class="p-3">Notes</th>
                </tr>
              </thead>
              <tbody id="reportsTableBody" class="divide-y divide-gray-800">
                <tr><td colspan="8" class="p-4 text-center text-gray-500">Loading collections...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================== TAB 4: ADMIN & SETTINGS ==================== -->
      <div id="adminTab-settings" class="hidden space-y-4">
        <div class="max-w-xl border border-gray-800 rounded-2xl p-6 bg-gray-900 shadow space-y-5">
          <div>
            <h3 class="text-sm font-bold">System Configuration & Pricing</h3>
            <p class="text-xs text-gray-400">Update milk purchase pricing and administration options.</p>
          </div>
          <form onsubmit="handleSaveSettings(event)" class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Price Per Litre (Tsh)</label>
              <input type="number" id="settingPricePerLitre" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm" placeholder="1000">
            </div>
            <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer">Save Settings</button>
          </form>
        </div>
      </div>

    </section>
  </main>

  <!-- ==================== MODAL: ADD FARMER ==================== -->
  <div id="farmerModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 bg-gray-900 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 class="text-base font-bold">Register New Farmer</h3>
        <button type="button" onclick="closeModal('farmerModal')" class="text-gray-400 hover:text-white text-xl cursor-pointer">&times;</button>
      </div>
      <form onsubmit="handleFarmerSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Full Name</label>
          <input type="text" id="farmerName" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm" placeholder="e.g. Juma Hance">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Phone Number</label>
          <input type="text" id="farmerPhone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm" placeholder="+255...">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Collection Zone</label>
          <input type="text" id="farmerZone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm" placeholder="e.g. Kimili">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal('farmerModal')" class="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs cursor-pointer">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Save Farmer</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==================== MODAL: EDIT FARMER ==================== -->
  <div id="editFarmerModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 bg-gray-900 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 class="text-base font-bold">Edit Farmer</h3>
        <button type="button" onclick="closeModal('editFarmerModal')" class="text-gray-400 hover:text-white text-xl cursor-pointer">&times;</button>
      </div>
      <form onsubmit="handleEditFarmer(event)" class="space-y-4">
        <input type="hidden" id="editFarmerId">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Farmer ID (read-only)</label>
          <input type="text" id="editFarmerCode" readonly class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2.5 text-gray-400 text-sm">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Full Name</label>
          <input type="text" id="editFarmerName" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Phone Number</label>
          <input type="text" id="editFarmerPhone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Collection Zone</label>
          <input type="text" id="editFarmerZone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Passkey (4 digits)</label>
          <input type="text" id="editFarmerPasskey" maxlength="4" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm tracking-widest">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal('editFarmerModal')" class="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs cursor-pointer">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Update Farmer</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ==================== MODAL: LOG INTAKE ==================== -->
  <div id="intakeModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 bg-gray-900 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 class="text-base font-bold">Log Milk Intake</h3>
        <button type="button" onclick="closeModal('intakeModal')" class="text-gray-400 hover:text-white text-xl cursor-pointer">&times;</button>
      </div>
      <form onsubmit="handleIntakeSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Select Farmer</label>
          <select id="intakeFarmerId" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm">
            <option value="">-- Choose Farmer --</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Milk Volume (Litres)</label>
          <input type="number" step="0.1" id="intakeLitres" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm" placeholder="e.g. 25.5">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Fat % (Optional)</label>
          <input type="number" step="0.1" id="intakeFat" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm" placeholder="e.g. 3.8">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Notes / Remarks</label>
          <input type="text" id="intakeNotes" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm" placeholder="Optional notes...">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal('intakeModal')" class="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-xs cursor-pointer">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer">Save Intake</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    // Global state
    let allFarmers = [];
    let allCollections = [];
    let currentSettings = { price_per_litre: 1000 };
    let isLoggedIn = false;

    // ========== VIEW HELPERS ==========
    function switchView(viewId) {
      const views = ['view-publicHome', 'view-staffLogin', 'view-managementPortal'];
      views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
      const target = document.getElementById('view-' + viewId);
      if (target) target.classList.remove('hidden');

      if (viewId === 'managementPortal') {
        document.getElementById('adminHeaderActions').classList.remove('hidden');
        document.getElementById('staffLoginNavBtn').classList.add('hidden');
        document.getElementById('farmerPortalBtn').classList.remove('hidden');
        document.getElementById('headerLogoutBtn').classList.remove('hidden');
      } else {
        document.getElementById('adminHeaderActions').classList.add('hidden');
        document.getElementById('headerLogoutBtn').classList.add('hidden');
        if (viewId === 'staffLogin') {
          document.getElementById('staffLoginNavBtn').classList.add('hidden');
          document.getElementById('farmerPortalBtn').classList.remove('hidden');
        } else {
          document.getElementById('staffLoginNavBtn').classList.remove('hidden');
          document.getElementById('farmerPortalBtn').classList.add('hidden');
        }
      }
    }

    function goHome() {
      if (isLoggedIn) {
        switchView('managementPortal');
        switchAdminTab('dashboard');
      } else {
        switchView('publicHome');
      }
    }

    function openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (modalId === 'intakeModal') {
          populateIntakeFarmerSelect();
        }
      }
    }

    function closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function toggleTheme() {
      const body = document.getElementById('appBody');
      if (body.classList.contains('bg-gray-950')) {
        body.classList.remove('bg-gray-950', 'text-gray-100');
        body.classList.add('bg-gray-100', 'text-gray-900');
      } else {
        body.classList.remove('bg-gray-100', 'text-gray-900');
        body.classList.add('bg-gray-950', 'text-gray-100');
      }
    }

    // ========== ADMIN TABS ==========
    function switchAdminTab(tab) {
      const tabs = ['dashboard', 'farmers', 'intakes', 'settings'];
      tabs.forEach(t => {
        const el = document.getElementById('adminTab-' + t);
        const btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
        if (el) el.classList.add('hidden');
        if (btn) btn.className = 'px-4 py-2 text-xs font-semibold rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center gap-2 shrink-0 cursor-pointer';
      });

      const activeEl = document.getElementById('adminTab-' + tab);
      const activeBtn = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
      if (activeEl) activeEl.classList.remove('hidden');
      if (activeBtn) activeBtn.className = 'px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white flex items-center gap-2 shrink-0 cursor-pointer';

      if (tab === 'dashboard') {
        loadDashboardData();
      } else if (tab === 'farmers') {
        loadFarmersDirectory();
      } else if (tab === 'intakes') {
        loadCollectionsData();
      } else if (tab === 'settings') {
        loadSettingsData();
      }
    }

    // ========== AUTH ==========
    function handleStaffLogin(e) {
      e.preventDefault();
      isLoggedIn = true;
      switchView('managementPortal');
      loadAllAppData();
      switchAdminTab('dashboard');
    }

    function handleLogout() {
      isLoggedIn = false;
      switchView('publicHome');
    }

    // ========== DATA LOADERS & DASHBOARD METRICS ==========
    async function loadAllAppData() {
      await Promise.all([
        loadFarmersDirectory(false),
        loadCollectionsData(false),
        loadSettingsData(false)
      ]);
      updateDashboardMetrics();
    }

    async function loadSettingsData(updateUI = true) {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        currentSettings = data;
        const priceInput = document.getElementById('settingPricePerLitre');
        if (priceInput) priceInput.value = data.price_per_litre || 1000;
        updateDashboardMetrics();
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    }

    async function handleSaveSettings(e) {
      e.preventDefault();
      const val = parseFloat(document.getElementById('settingPricePerLitre').value);
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price_per_litre: val })
        });
        const result = await res.json();
        if (result.success) {
          alert('Settings saved successfully!');
          currentSettings = result.settings;
          updateDashboardMetrics();
        } else {
          alert('Failed to save settings.');
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function loadFarmersDirectory(render = true) {
      try {
        const res = await fetch('/api/farmers');
        allFarmers = await res.json();
        if (render) renderFarmersTable(allFarmers);
        updateDashboardMetrics();
      } catch (err) {
        console.error('Error loading farmers:', err);
      }
    }

    async function loadCollectionsData(render = true) {
      try {
        const res = await fetch('/api/collections');
        allCollections = await res.json();
        if (render) {
          renderReportsTable(allCollections);
          renderDashboardRecentTable(allCollections);
        }
        updateDashboardMetrics();
      } catch (err) {
        console.error('Error loading collections:', err);
      }
    }

    function loadDashboardData() {
      loadFarmersDirectory(false);
      loadCollectionsData(true);
      loadSettingsData(false);
    }

    function updateDashboardMetrics() {
      // Total Farmers
      const totalFarmersEl = document.getElementById('statTotalFarmers');
      if (totalFarmersEl) totalFarmersEl.innerText = allFarmers.length;

      // Total Milk Intake
      let totalLitres = 0;
      allCollections.forEach(c => {
        totalLitres += parseFloat(c.litres || c.quantity || 0);
      });
      const totalLitresEl = document.getElementById('statTotalLitres');
      if (totalLitresEl) totalLitresEl.innerText = totalLitres.toLocaleString() + ' L';

      // Price per Litre
      const priceEl = document.getElementById('statPricePerLitre');
      if (priceEl) priceEl.innerText = (currentSettings.price_per_litre || 1000).toLocaleString() + ' Tsh';
    }

    // ========== TABLES & RENDERING ==========
    function renderFarmersTable(farmers) {
      const tbody = document.getElementById('farmersTableBody');
      if (!tbody) return;
      if (!farmers || !farmers.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No farmers registered yet.</td></tr>';
        return;
      }
      tbody.innerHTML = farmers.map(f => `
        <tr class="hover:bg-gray-800/50">
          <td class="p-3 font-mono text-emerald-400">${f.farmer_id || '-'}</td>
          <td class="p-3 font-semibold">${f.name || '-'}</td>
          <td class="p-3 text-gray-300">${f.phone || '-'}</td>
          <td class="p-3 text-gray-300">${f.zone || '-'}</td>
          <td class="p-3 font-mono text-yellow-400">${f.passkey || '----'}</td>
          <td class="p-3 text-center space-x-1">
            <button onclick="openEditFarmer('${f.id}')" class="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[10px] cursor-pointer">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button onclick="deleteFarmer('${f.id}', '${f.name}')" class="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-[10px] cursor-pointer">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }

    function filterFarmers() {
      const q = document.getElementById('farmerSearch').value.toLowerCase();
      const filtered = allFarmers.filter(f =>
        (f.farmer_id || '').toLowerCase().includes(q) ||
        (f.name || '').toLowerCase().includes(q) ||
        (f.zone || '').toLowerCase().includes(q) ||
        (f.phone || '').toLowerCase().includes(q)
      );
      renderFarmersTable(filtered);
    }

    function renderDashboardRecentTable(collections) {
      const tbody = document.getElementById('dashboardRecentTableBody');
      if (!tbody) return;
      if (!collections || !collections.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No recent collection logs.</td></tr>';
        return;
      }
      const recent = collections.slice(0, 5);
      const price = currentSettings.price_per_litre || 1000;

      tbody.innerHTML = recent.map(c => {
        const date = c.created_at ? new Date(c.created_at).toLocaleString('en-GB') : '-';
        const farmerName = c.farmers?.name || c.farmer_id || '-';
        const zone = c.farmers?.zone || '-';
        const litres = parseFloat(c.litres || c.quantity || 0);
        const totalTsh = (litres * price).toLocaleString();
        return `
          <tr class="hover:bg-gray-800/50">
            <td class="p-3 font-semibold">${farmerName}</td>
            <td class="p-3 text-gray-300">${zone}</td>
            <td class="p-3 font-mono text-emerald-400">${litres} L</td>
            <td class="p-3">${c.fat ? c.fat + '%' : '-'}</td>
            <td class="p-3 font-semibold text-purple-400">${totalTsh} Tsh</td>
            <td class="p-3 text-gray-400 text-[11px]">${date}</td>
          </tr>
        `;
      }).join('');
    }

    function renderReportsTable(collections) {
      const tbody = document.getElementById('reportsTableBody');
      if (!tbody) return;
      if (!collections || !collections.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-500">No collection records yet.</td></tr>';
        return;
      }
      const price = currentSettings.price_per_litre || 1000;

      tbody.innerHTML = collections.map(c => {
        const date = c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '-';
        const farmerId = c.farmers?.farmer_id || c.farmer_id || '-';
        const name = c.farmers?.name || '-';
        const zone = c.farmers?.zone || '-';
        const litres = parseFloat(c.litres || c.quantity || 0);
        const totalTsh = (litres * price).toLocaleString();
        return `
          <tr class="hover:bg-gray-800/50">
            <td class="p-3">${date}</td>
            <td class="p-3 font-mono text-emerald-400">${farmerId}</td>
            <td class="p-3">${name}</td>
            <td class="p-3">${zone}</td>
            <td class="p-3 font-semibold">${litres}</td>
            <td class="p-3">${c.fat ? c.fat + '%' : '-'}</td>
            <td class="p-3 font-semibold text-purple-400">${totalTsh}</td>
            <td class="p-3 text-gray-400">${c.notes || '-'}</td>
          </tr>
        `;
      }).join('');
    }

    function filterReports() {
      const q = document.getElementById('reportSearch').value.toLowerCase();
      const filtered = allCollections.filter(c => {
        const farmerId = (c.farmers?.farmer_id || c.farmer_id || '').toLowerCase();
        const name = (c.farmers?.name || '').toLowerCase();
        return farmerId.includes(q) || name.includes(q);
      });
      renderReportsTable(filtered);
    }

    // ========== FARMER ACTIONS ==========
    async function handleFarmerSubmit(e) {
      e.preventDefault();
      const payload = {
        name: document.getElementById('farmerName').value.trim(),
        phone: document.getElementById('farmerPhone').value.trim(),
        zone: document.getElementById('farmerZone').value.trim()
      };

      try {
        const res = await fetch('/api/farmers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          alert(
            `✅ Farmer registered successfully!\n\n` +
            `Farmer ID: ${result.farmer.farmer_id}\n` +
            `Passkey: ${result.farmer.passkey}\n\n` +
            `Please give these details to the farmer.`
          );
          closeModal('farmerModal');
          document.getElementById('farmerName').value = '';
          document.getElementById('farmerPhone').value = '';
          document.getElementById('farmerZone').value = '';
          loadFarmersDirectory(true);
        } else {
          alert('Error: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    function openEditFarmer(id) {
      const farmer = allFarmers.find(f => f.id == id);
      if (!farmer) return;

      document.getElementById('editFarmerId').value = farmer.id;
      document.getElementById('editFarmerCode').value = farmer.farmer_id || '';
      document.getElementById('editFarmerName').value = farmer.name || '';
      document.getElementById('editFarmerPhone').value = farmer.phone || '';
      document.getElementById('editFarmerZone').value = farmer.zone || '';
      document.getElementById('editFarmerPasskey').value = farmer.passkey || '';
      openModal('editFarmerModal');
    }

    async function handleEditFarmer(e) {
      e.preventDefault();
      const id = document.getElementById('editFarmerId').value;
      const payload = {
        name: document.getElementById('editFarmerName').value.trim(),
        phone: document.getElementById('editFarmerPhone').value.trim(),
        zone: document.getElementById('editFarmerZone').value.trim(),
        passkey: document.getElementById('editFarmerPasskey').value.trim()
      };

      try {
        const res = await fetch('/api/farmers/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          alert('Farmer updated successfully!');
          closeModal('editFarmerModal');
          loadFarmersDirectory(true);
        } else {
          alert('Error: ' + (result.error || 'Update failed'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function deleteFarmer(id, name) {
      if (!confirm(`Are you sure you want to delete farmer "${name}"?\nThis action cannot be undone.`)) return;

      try {
        const res = await fetch('/api/farmers/' + id, { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
          alert('Farmer deleted successfully.');
          loadFarmersDirectory(true);
        } else {
          alert('Error: ' + (result.error || 'Delete failed'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    // ========== INTAKE LOGGING ==========
    function populateIntakeFarmerSelect() {
      const select = document.getElementById('intakeFarmerId');
      if (!select) return;
      select.innerHTML = '<option value="">-- Choose Farmer --</option>' + allFarmers.map(f => `
        <option value="${f.id}">${f.farmer_id} - ${f.name} (${f.zone || 'No Zone'})</option>
      `).join('');
    }

    async function handleIntakeSubmit(e) {
      e.preventDefault();
      const payload = {
        farmer_id: document.getElementById('intakeFarmerId').value,
        litres: parseFloat(document.getElementById('intakeLitres').value),
        fat: document.getElementById('intakeFat').value ? parseFloat(document.getElementById('intakeFat').value) : null,
        notes: document.getElementById('intakeNotes').value.trim()
      };

      try {
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          alert('✅ Milk intake logged successfully!');
          closeModal('intakeModal');
          document.getElementById('intakeLitres').value = '';
          document.getElementById('intakeFat').value = '';
          document.getElementById('intakeNotes').value = '';
          loadCollectionsData(true);
        } else {
          alert('Error logging intake: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    // ========== EXPORTS ==========
    function exportReport(format) {
      const q = document.getElementById('reportSearch') ? document.getElementById('reportSearch').value.toLowerCase() : '';
      let data = allCollections;
      const price = currentSettings.price_per_litre || 1000;

      if (q) {
        data = allCollections.filter(c => {
          const farmerId = (c.farmers?.farmer_id || c.farmer_id || '').toLowerCase();
          const name = (c.farmers?.name || '').toLowerCase();
          return farmerId.includes(q) || name.includes(q);
        });
      }

      if (!data.length) {
        alert('No data to export.');
        return;
      }

      const rows = data.map(c => ({
        Date: c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '',
        'Farmer ID': c.farmers?.farmer_id || c.farmer_id || '',
        Name: c.farmers?.name || '',
        Zone: c.farmers?.zone || '',
        Litres: c.litres || c.quantity || '',
        'Fat %': c.fat || '',
        'Total (Tsh)': ((c.litres || c.quantity || 0) * price),
        Notes: c.notes || ''
      }));

      if (format === 'csv') {
        const headers = Object.keys(rows[0]).join(',');
        const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'milk_collections_report.csv';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Collections');
        XLSX.writeFile(wb, 'milk_collections_report.xlsx');
      }
    }

    function handleFarmerLogin(e) {
      e.preventDefault();
      alert('Farmer portal login coming soon. Currently only admin features are active.');
    }
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
