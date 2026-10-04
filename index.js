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

// ==================== PUBLIC DASHBOARD & ADMIN UI ====================
app.get('/', async (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milk Collection Hub & Admin Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen flex flex-col font-sans antialiased pb-20">

  <!-- Navigation Bar -->
  <header class="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-lg">
    <div class="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
      <div class="flex items-center space-x-3">
        <div class="bg-blue-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-900/40">
          <i class="fa-solid fa-bucket text-lg"></i>
        </div>
        <div>
          <h1 class="text-base sm:text-lg font-bold text-white tracking-wide">Milk Collection Hub</h1>
          <p class="text-[11px] text-gray-400">Management & Admin Portal</p>
        </div>
      </div>
    </div>
    <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
      <button type="button" onclick="openModal('farmerModal')" class="flex-1 sm:flex-none bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-gray-700 shadow-sm cursor-pointer">
        <i class="fa-solid fa-user-plus text-blue-400"></i> New Farmer
      </button>
      <button type="button" onclick="openModal('collectionModal')" class="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer">
        <i class="fa-solid fa-plus"></i> Log Intake
      </button>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <nav class="bg-gray-900/90 border-b border-gray-800 px-3 sm:px-6 grid grid-cols-2 sm:flex sm:space-x-4 text-xs sm:text-sm sticky top-[125px] sm:top-[69px] z-30 backdrop-blur">
    <button type="button" onclick="switchTab('dashboard')" id="nav-dashboard" class="py-3 px-2 border-b-2 border-blue-500 font-medium text-blue-400 flex items-center justify-center sm:justify-start space-x-2 transition cursor-pointer">
      <i class="fa-solid fa-chart-pie"></i><span>Dashboard</span>
    </button>
    <button type="button" onclick="switchTab('farmers')" id="nav-farmers" class="py-3 px-2 border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center justify-center sm:justify-start space-x-2 transition cursor-pointer">
      <i class="fa-solid fa-users"></i><span>Farmers</span>
    </button>
    <button type="button" onclick="switchTab('collections')" id="nav-collections" class="py-3 px-2 border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center justify-center sm:justify-start space-x-2 transition cursor-pointer">
      <i class="fa-solid fa-clipboard-list"></i><span>Intakes</span>
    </button>
    <button type="button" onclick="switchTab('admin')" id="nav-admin" class="py-3 px-2 border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center justify-center sm:justify-start space-x-2 transition cursor-pointer">
      <i class="fa-solid fa-shield-halved text-purple-400"></i><span>Admin & Settings</span>
    </button>
  </nav>

  <!-- Main Content Area -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

    <!-- CONNECTION ERROR BANNER (Hidden by default) -->
    <div id="errorBanner" class="hidden bg-red-950/80 border border-red-800 text-red-200 p-4 rounded-xl text-xs flex justify-between items-center shadow-lg">
      <span id="errorMessage">Database connection error.</span>
      <button onclick="loadDashboardData()" class="bg-red-900 hover:bg-red-800 text-white px-3 py-1.5 rounded font-bold">Retry</button>
    </div>

    <!-- TAB 1: DASHBOARD -->
    <section id="tab-dashboard" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl flex items-center justify-between shadow">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered Farmers</p>
            <h2 id="totalFarmers" class="text-3xl font-extrabold text-white mt-1">0</h2>
          </div>
          <div class="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <i class="fa-solid fa-users text-2xl"></i>
          </div>
        </div>

        <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl flex items-center justify-between shadow">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Milk Intake</p>
            <h2 id="totalLiters" class="text-3xl font-extrabold text-emerald-400 mt-1">0 <span class="text-base font-normal text-gray-400">L</span></h2>
          </div>
          <div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <i class="fa-solid fa-glass-water text-2xl"></i>
          </div>
        </div>

        <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl flex items-center justify-between shadow">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Price / Litre</p>
            <h2 id="statPrice" class="text-3xl font-extrabold text-blue-400 mt-1">-- <span class="text-xs text-gray-400">Tsh</span></h2>
          </div>
          <div class="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <i class="fa-solid fa-coins text-2xl"></i>
          </div>
        </div>
      </div>

      <!-- Recent Intakes Table -->
      <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow">
        <div class="px-5 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-clock-rotate-left text-blue-400"></i> Recent Intakes
          </h3>
          <button onclick="loadDashboardData()" class="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300 transition flex items-center gap-1.5 border border-gray-700 cursor-pointer">
            <i class="fa-solid fa-rotate"></i> Refresh
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm text-gray-300">
            <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px]">
              <tr>
                <th class="px-4 sm:px-6 py-3">Farmer</th>
                <th class="px-4 sm:px-6 py-3">Zone</th>
                <th class="px-4 sm:px-6 py-3">Volume (L)</th>
                <th class="px-4 sm:px-6 py-3">Fat %</th>
                <th class="px-4 sm:px-6 py-3">Total (Tsh)</th>
                <th class="px-4 sm:px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody id="collectionsTable" class="divide-y divide-gray-800">
              <tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading collection logs...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 2: FARMERS DIRECTORY -->
    <section id="tab-farmers" class="hidden space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg sm:text-xl font-bold text-white">Farmers Directory</h2>
        <button type="button" onclick="openModal('farmerModal')" class="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-2 rounded-lg font-semibold text-white cursor-pointer">Add Farmer</button>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm text-gray-300">
            <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px]">
              <tr>
                <th class="px-4 sm:px-6 py-3">Name</th>
                <th class="px-4 sm:px-6 py-3">Phone</th>
                <th class="px-4 sm:px-6 py-3">Zone / Location</th>
                <th class="px-4 sm:px-6 py-3">Registered Date</th>
              </tr>
            </thead>
            <tbody id="farmersTableBody" class="divide-y divide-gray-800">
              <tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Loading directory...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 3: ALL COLLECTIONS -->
    <section id="tab-collections" class="hidden space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg sm:text-xl font-bold text-white">All Collection Records</h2>
        <button type="button" onclick="openModal('collectionModal')" class="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-2 rounded-lg font-semibold text-white cursor-pointer">Log Intake</button>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm text-gray-300">
            <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px]">
              <tr>
                <th class="px-4 sm:px-6 py-3">Farmer</th>
                <th class="px-4 sm:px-6 py-3">Zone</th>
                <th class="px-4 sm:px-6 py-3">Volume (L)</th>
                <th class="px-4 sm:px-6 py-3">Fat %</th>
                <th class="px-4 sm:px-6 py-3">Total Payout (Tsh)</th>
                <th class="px-4 sm:px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody id="allCollectionsTable" class="divide-y divide-gray-800">
              <tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading records...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 4: ADMIN & SETTINGS -->
    <section id="tab-admin" class="hidden space-y-6">
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow space-y-4">
        <h2 class="text-sm sm:text-base font-bold text-blue-400 flex items-center gap-2">
          <i class="fa-solid fa-coins"></i> Milk Price Configuration
        </h2>
        <p class="text-xs text-gray-400">Set standard price per litre used for automated payout calculations.</p>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input type="number" id="milkPriceInput" placeholder="e.g. 1000" class="bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-lg text-sm w-full sm:w-48 text-white focus:outline-none focus:border-blue-500">
          <button type="button" onclick="saveMilkPrice()" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition cursor-pointer">Save Price</button>
        </div>
      </div>

      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-sm sm:text-base font-bold text-purple-400 flex items-center gap-2">
            <i class="fa-solid fa-user-shield"></i> User Role Management
          </h2>
          <button type="button" onclick="openModal('userModal')" class="bg-purple-600 hover:bg-purple-500 text-xs px-3.5 py-2 rounded-lg font-semibold text-white cursor-pointer">Add User</button>
        </div>
        <p class="text-xs text-gray-400">Create login credentials, assign roles, and manage permissions.</p>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm text-gray-300">
            <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px]">
              <tr>
                <th class="px-3 sm:px-4 py-3">Username</th>
                <th class="px-3 sm:px-4 py-3">Role</th>
                <th class="px-3 sm:px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody id="usersTableBody" class="divide-y divide-gray-800">
              <tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">No users configured.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

  </main>

  <!-- MODAL: ADD FARMER -->
  <div id="farmerModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 class="text-base font-bold text-white">Register New Farmer</h3>
        <button type="button" onclick="closeModal('farmerModal')" class="text-gray-400 hover:text-white text-xl p-1 cursor-pointer">&times;</button>
      </div>
      <form id="farmerForm" onsubmit="handleFarmerSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Full Name</label>
          <input type="text" id="farmerName" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Juma Kassim">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Phone Number</label>
          <input type="text" id="farmerPhone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="+255...">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Collection Zone / Village</label>
          <input type="text" id="farmerZone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Zone A">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal('farmerModal')" class="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium cursor-pointer">Cancel</button>
          <button type="submit" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer">Save Farmer</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: LOG INTAKE -->
  <div id="collectionModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 class="text-base font-bold text-white">Log Milk Intake</h3>
        <button type="button" onclick="closeModal('collectionModal')" class="text-gray-400 hover:text-white text-xl p-1 cursor-pointer">&times;</button>
      </div>
      <form id="collectionForm" onsubmit="handleCollectionSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Select Farmer</label>
          <select id="collectionFarmerId" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="">Select a farmer...</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Volume (Litres)</label>
          <input type="number" step="0.1" id="collectionLiters" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="0.0">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Fat Content (%) <span class="text-gray-500">(Optional)</span></label>
          <input type="number" step="0.01" id="collectionFat" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. 3.8">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal('collectionModal')" class="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium cursor-pointer">Cancel</button>
          <button type="submit" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer">Record Intake</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: CREATE / EDIT SYSTEM USER -->
  <div id="userModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 id="userModalTitle" class="text-base font-bold text-white">Create System User</h3>
        <button type="button" onclick="closeModal('userModal')" class="text-gray-400 hover:text-white text-xl p-1 cursor-pointer">&times;</button>
      </div>
      <form id="userForm" onsubmit="handleUserSubmit(event)" class="space-y-4">
        <input type="hidden" id="editingUserIndex" value="">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Username</label>
          <input type="text" id="userNameInput" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="username">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Password</label>
          <input type="text" id="userPasswordInput" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Password">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Role</label>
          <select id="userRoleInput" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="Admin">Administrator</option>
            <option value="Clerk">Collection Clerk</option>
            <option value="Auditor">Auditor</option>
          </select>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal('userModal')" class="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium cursor-pointer">Cancel</button>
          <button type="submit" class="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer">Save User</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let currentPrice = parseFloat(localStorage.getItem('milk_price_per_litre')) || 1000;
    let systemUsers = JSON.parse(localStorage.getItem('milk_app_users')) || [
      { username: 'admin', password: 'password123', role: 'Admin' }
    ];
    let cachedFarmers = [];
    let cachedCollections = [];

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('milkPriceInput').value = currentPrice;
      document.getElementById('statPrice').innerHTML = \`\${currentPrice.toLocaleString()} <span class="text-xs text-gray-400">Tsh</span>\`;
      loadDashboardData();
      renderUsersTable();
    });

    function switchTab(tabName) {
      ['dashboard', 'farmers', 'collections', 'admin'].forEach(t => {
        const sec = document.getElementById(\`tab-\${t}\`);
        const nav = document.getElementById(\`nav-\${t}\`);
        if(sec) sec.classList.add('hidden');
        if(nav) {
          nav.classList.remove('border-blue-500', 'text-blue-400', 'text-purple-400');
          nav.classList.add('border-transparent', 'text-gray-400');
        }
      });
      const activeSec = document.getElementById(\`tab-\${tabName}\`);
      const activeNav = document.getElementById(\`nav-\${tabName}\`);
      if(activeSec) activeSec.classList.remove('hidden');
      if(activeNav) {
        activeNav.classList.add('border-blue-500', tabName === 'admin' ? 'text-purple-400' : 'text-blue-400');
        activeNav.classList.remove('border-transparent', 'text-gray-400');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openModal(id) {
      const modal = document.getElementById(id);
      if(!modal) return;
      if (id === 'userModal') {
        document.getElementById('editingUserIndex').value = '';
        document.getElementById('userModalTitle').innerText = 'Create System User';
        document.getElementById('userForm').reset();
      }
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeModal(id) {
      const modal = document.getElementById(id);
      if(!modal) return;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    async function loadDashboardData() {
      const errorBanner = document.getElementById('errorBanner');
      const errorMessage = document.getElementById('errorMessage');
      if(errorBanner) errorBanner.classList.add('hidden');

      try {
        const [farmersRes, collectionsRes] = await Promise.all([
          fetch('/api/farmers'),
          fetch('/api/collections')
        ]);

        const farmersData = await farmersRes.json();
        const collectionsData = await collectionsRes.json();

        if (!farmersData.success) throw new Error(farmersData.error || 'Failed to load farmers');
        if (!collectionsData.success) throw new Error(collectionsData.error || 'Failed to load collections');

        cachedFarmers = farmersData.data || [];
        cachedCollections = collectionsData.data || [];

        document.getElementById('totalFarmers').innerText = cachedFarmers.length;
        
        const sumLiters = cachedCollections.reduce((acc, c) => acc + Number(c.liters || 0), 0);
        document.getElementById('totalLiters').innerHTML = \`\${sumLiters.toFixed(1)} <span class="text-base font-normal text-gray-400">L</span>\`;

        const selectEl = document.getElementById('collectionFarmerId');
        selectEl.innerHTML = '<option value="">Select a farmer...</option>';
        cachedFarmers.forEach(f => {
          selectEl.innerHTML += \`<option value="\${f.id}">\${f.name} (\${f.zone || 'No Zone'})\</option>\`;
        });

        const farmersTableBody = document.getElementById('farmersTableBody');
        if (cachedFarmers.length === 0) {
          farmersTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No registered farmers yet. Click "New Farmer" to add one.</td></tr>';
        } else {
          farmersTableBody.innerHTML = cachedFarmers.map(f => \`
            <tr class="hover:bg-gray-800/40 transition">
              <td class="px-4 sm:px-6 py-3 font-semibold text-white">\${f.name}</td>
              <td class="px-4 sm:px-6 py-3 text-gray-400">\${f.phone || 'No phone'}</td>
              <td class="px-4 sm:px-6 py-3"><span class="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">\${f.zone || 'Unassigned'}</span></td>
              <td class="px-4 sm:px-6 py-3 text-xs text-gray-400">\${new Date(f.created_at || Date.now()).toLocaleDateString()}</td>
            </tr>
          \`).join('');
        }

        renderIntakesTable(cachedCollections.slice(0, 5), document.getElementById('collectionsTable'));
        renderIntakesTable(cachedCollections, document.getElementById('allCollectionsTable'));

      } catch (err) {
        console.error('Data load error:', err);
        if(errorBanner && errorMessage) {
          errorMessage.innerText = 'Database Error: ' + err.message + '. Make sure Supabase tables (farmers, collections) are created.';
          errorBanner.classList.remove('hidden');
        }
      }
    }

    function renderIntakesTable(dataList, tableElement) {
      if (!tableElement) return;
      if (dataList.length === 0) {
        tableElement.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No collection entries recorded.</td></tr>';
        return;
      }
      tableElement.innerHTML = dataList.map(c => {
        const liters = Number(c.liters || 0);
        const totalPayout = liters * currentPrice;
        const farmerName = c.farmers ? c.farmers.name : 'Unknown';
        const farmerZone = c.farmers ? (c.farmers.zone || '-') : '-';
        return \`
          <tr class="hover:bg-gray-800/40 transition">
            <td class="px-4 sm:px-6 py-3 font-semibold text-white">\${farmerName}</td>
            <td class="px-4 sm:px-6 py-3 text-xs text-gray-400">\${farmerZone}</td>
            <td class="px-4 sm:px-6 py-3 font-bold text-emerald-400">\${liters.toFixed(1)} L</td>
            <td class="px-4 sm:px-6 py-3">\${c.fat_content ? c.fat_content + '%' : '-'}</td>
            <td class="px-4 sm:px-6 py-3 font-semibold text-blue-400">\${totalPayout.toLocaleString()} Tsh</td>
            <td class="px-4 sm:px-6 py-3 text-xs text-gray-400">\${new Date(c.collection_date || c.created_at).toLocaleString()}</td>
          </tr>
        \`;
      }).join('');
    }

    async function handleFarmerSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('farmerName').value;
      const phone = document.getElementById('farmerPhone').value;
      const zone = document.getElementById('farmerZone').value;

      try {
        const res = await fetch('/api/farmers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, zone })
        });
        const json = await res.json();
        if(!json.success) throw new Error(json.error);

        document.getElementById('farmerForm').reset();
        closeModal('farmerModal');
        loadDashboardData();
      } catch(err) {
        alert('Error saving farmer: ' + err.message);
      }
    }

    async function handleCollectionSubmit(e) {
      e.preventDefault();
      const farmer_id = document.getElementById('collectionFarmerId').value;
      const liters = document.getElementById('collectionLiters').value;
      const fat_content = document.getElementById('collectionFat').value;

      try {
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmer_id, liters, fat_content })
        });
        const json = await res.json();
        if(!json.success) throw new Error(json.error);

        document.getElementById('collectionForm').reset();
        closeModal('collectionModal');
        loadDashboardData();
      } catch(err) {
        alert('Error recording intake: ' + err.message);
      }
    }

    function saveMilkPrice() {
      const val = parseFloat(document.getElementById('milkPriceInput').value);
      if (!isNaN(val) && val > 0) {
        currentPrice = val;
        localStorage.setItem('milk_price_per_litre', currentPrice);
        document.getElementById('statPrice').innerHTML = \`\${currentPrice.toLocaleString()} <span class="text-xs text-gray-400">Tsh</span>\`;
        alert('Milk price per litre updated successfully!');
        loadDashboardData();
      } else {
        alert('Please enter a valid price.');
      }
    }

    function renderUsersTable() {
      const tbody = document.getElementById('usersTableBody');
      if (!tbody) return;
      if (systemUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">No users configured.</td></tr>';
        return;
      }
      tbody.innerHTML = systemUsers.map((u, index) => \`
        <tr class="hover:bg-gray-800/40 transition">
          <td class="px-3 sm:px-4 py-3 font-medium text-white">\${u.username}</td>
          <td class="px-3 sm:px-4 py-3"><span class="bg-purple-950 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded text-xs font-semibold">\${u.role}</span></td>
          <td class="px-3 sm:px-4 py-3 space-x-1 sm:space-x-2">
            <button type="button" onclick="editUser(\${index})" class="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-950/40 rounded border border-blue-900/50 cursor-pointer"><i class="fa-solid fa-pen"></i></button>
            <button type="button" onclick="deleteUser(\${index})" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-950/40 rounded border border-red-900/50 cursor-pointer"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      \`).join('');
    }

    function handleUserSubmit(e) {
      e.preventDefault();
      const idx = document.getElementById('editingUserIndex').value;
      const username = document.getElementById('userNameInput').value;
      const password = document.getElementById('userPasswordInput').value;
      const role = document.getElementById('userRoleInput').value;

      if (idx === '') {
        systemUsers.push({ username, password, role });
      } else {
        systemUsers[idx] = { username, password, role };
      }

      localStorage.setItem('milk_app_users', JSON.stringify(systemUsers));
      closeModal('userModal');
      renderUsersTable();
    }

    function editUser(index) {
      const u = systemUsers[index];
      document.getElementById('editingUserIndex').value = index;
      document.getElementById('userNameInput').value = u.username;
      document.getElementById('userPasswordInput').value = u.password;
      document.getElementById('userRoleInput').value = u.role;
      document.getElementById('userModalTitle').innerText = 'Modify System User';
      openModal('userModal');
    }

    function deleteUser(index) {
      if (confirm('Are you sure you want to delete this user?')) {
        systemUsers.splice(index, 1);
        localStorage.setItem('milk_app_users', JSON.stringify(systemUsers));
        renderUsersTable();
      }
    }
  </script>
</body>
</html>
  `);
});

// ==================== FARMERS ENDPOINTS ====================
app.get('/api/farmers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('farmers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/farmers', async (req, res) => {
  try {
    const { name, phone, zone } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Farmer name is required' });

    const { data, error } = await supabase
      .from('farmers')
      .insert([{ name, phone, zone }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== COLLECTIONS ENDPOINTS ====================
app.get('/api/collections', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        farmers (name, phone, zone)
      `)
      .order('collection_date', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/collections', async (req, res) => {
  try {
    const { farmer_id, liters, fat_content, collection_date } = req.body;
    if (!farmer_id || liters === undefined) {
      return res.status(400).json({ success: false, error: 'farmer_id and liters are required' });
    }

    const { data, error } = await supabase
      .from('collections')
      .insert([{
        farmer_id,
        liters,
        fat_content: fat_content || null,
        collection_date: collection_date || new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Milk Collection Dashboard & Admin Portal running on port ${PORT}`);
});
