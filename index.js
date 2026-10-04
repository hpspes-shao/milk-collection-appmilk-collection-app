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

// ==================== MAIN APPLICATION ROUTE ====================
app.get('/', async (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milk Collection Hub & Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen flex flex-col font-sans antialiased pb-20">

  <!-- TOP HEADER -->
  <header class="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex justify-between items-center shadow-lg">
    <div class="flex items-center space-x-3">
      <div class="bg-blue-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-900/40">
        <i class="fa-solid fa-bucket text-lg"></i>
      </div>
      <div>
        <h1 class="text-base sm:text-lg font-bold text-white tracking-wide">Milk Collection Hub</h1>
        <p class="text-[11px] text-gray-400">Management & Farmer Portal</p>
      </div>
    </div>
    <div id="headerAuthActions" class="flex items-center space-x-2">
      <button onclick="showView('publicHome')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-gray-700 cursor-pointer">
        <i class="fa-solid fa-user text-emerald-400"></i> Farmer Portal
      </button>
      <button onclick="showView('staffLogin')" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow cursor-pointer">
        <i class="fa-solid fa-lock text-white"></i> Staff / Admin Login
      </button>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

    <!-- CONNECTION ERROR BANNER -->
    <div id="errorBanner" class="hidden bg-red-950/80 border border-red-800 text-red-200 p-4 rounded-xl text-xs flex justify-between items-center shadow-lg">
      <span id="errorMessage">Database connection error.</span>
      <button onclick="initApp()" class="bg-red-900 hover:bg-red-800 text-white px-3 py-1.5 rounded font-bold">Retry</button>
    </div>

    <!-- VIEW 1: PUBLIC / FARMER PORTAL LOGIN & VIEW -->
    <section id="view-publicHome" class="space-y-6">
      <div class="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div class="text-center space-y-1">
          <div class="inline-block bg-emerald-500/10 text-emerald-400 p-3 rounded-full mb-1">
            <i class="fa-solid fa-id-card text-2xl"></i>
          </div>
          <h2 class="text-lg font-bold text-white">Farmer Contribution Portal</h2>
          <p class="text-xs text-gray-400">Enter your Farmer ID and 4-digit Passkey to view your milk delivery history and payouts.</p>
        </div>
        <form onsubmit="handleFarmerLogin(event)" class="space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Farmer Registration ID</label>
            <input type="number" id="loginFarmerId" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 1, 2, 3...">
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">4-Digit Passkey PIN</label>
            <input type="password" maxlength="4" id="loginPasskey" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm tracking-widest focus:outline-none focus:border-emerald-500" placeholder="••••">
          </div>
          <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg text-xs transition cursor-pointer shadow">View My Contributions</button>
        </form>
      </div>

      <!-- Farmer Portal Dashboard Result (Hidden until login) -->
      <div id="farmerPortalResult" class="hidden space-y-6">
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex justify-between items-center shadow">
          <div>
            <span class="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Welcome Farmer</span>
            <h2 id="portalFarmerName" class="text-xl font-extrabold text-white">--</h2>
            <p id="portalFarmerMeta" class="text-xs text-gray-400">Zone: -- | Phone: --</p>
          </div>
          <button onclick="logoutFarmerPortal()" class="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-2 rounded-lg cursor-pointer border border-gray-700">Logout Portal</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow">
            <p class="text-xs font-semibold text-gray-400 uppercase">Total Milk Delivered</p>
            <h2 id="portalTotalLiters" class="text-2xl font-extrabold text-emerald-400 mt-1">0 L</h2>
          </div>
          <div class="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow">
            <p class="text-xs font-semibold text-gray-400 uppercase">Total Earned Payout</p>
            <h2 id="portalTotalPayout" class="text-2xl font-extrabold text-blue-400 mt-1">0 Tsh</h2>
          </div>
        </div>

        <!-- Latest Broadcast Announcements for Farmers -->
        <div class="bg-blue-950/30 border border-blue-900/50 rounded-2xl p-4 space-y-2">
          <h3 class="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-bullhorn"></i> Announcements & Broadcasts
          </h3>
          <div id="portalAnnouncementsList" class="text-xs text-gray-300 space-y-1">
            <p class="text-gray-500">No recent announcements.</p>
          </div>
        </div>

        <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow">
          <div class="px-5 py-4 border-b border-gray-800">
            <h3 class="text-sm font-bold text-white">Your Delivery History</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm text-gray-300">
              <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px]">
                <tr>
                  <th class="px-4 py-3">Volume (L)</th>
                  <th class="px-4 py-3">Fat %</th>
                  <th class="px-4 py-3">Payout (Tsh)</th>
                  <th class="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody id="portalCollectionsTable" class="divide-y divide-gray-800">
                <tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">Loading your history...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- VIEW 2: STAFF / ADMIN LOGIN -->
    <section id="view-staffLogin" class="hidden space-y-6">
      <div class="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div class="text-center space-y-1">
          <div class="inline-block bg-blue-500/10 text-blue-400 p-3 rounded-full mb-1">
            <i class="fa-solid fa-shield-halved text-2xl"></i>
          </div>
          <h2 class="text-lg font-bold text-white">Staff & Admin Authentication</h2>
          <p class="text-xs text-gray-400">Log in with your system credentials to access management controls.</p>
        </div>
        <form onsubmit="handleStaffLogin(event)" class="space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Username</label>
            <input type="text" id="staffUsername" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Username">
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Password</label>
            <input type="password" id="staffPassword" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Password">
          </div>
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-xs transition cursor-pointer shadow">Authenticate Admin / Staff</button>
        </form>
      </div>
    </section>

    <!-- VIEW 3: FULL MANAGEMENT PORTAL (Admin / Sub-Admin / Clerk) -->
    <section id="view-managementPortal" class="hidden space-y-6">
      
      <!-- Management Sub-Header Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow">
        <div class="flex items-center gap-3">
          <div class="bg-purple-600/20 text-purple-400 p-2.5 rounded-xl">
            <i class="fa-solid fa-user-gear text-lg"></i>
          </div>
          <div>
            <span id="activeUserBadge" class="bg-purple-950 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded text-[10px] font-bold">Role: Admin</span>
            <h2 id="activeUserName" class="text-sm font-bold text-white mt-0.5">Logged in Staff</h2>
          </div>
        </div>
        <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button type="button" onclick="openModal('farmerModal')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-gray-700 cursor-pointer">
            <i class="fa-solid fa-user-plus text-blue-400"></i> New Farmer
          </button>
          <button type="button" onclick="openModal('collectionModal')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer">
            <i class="fa-solid fa-plus"></i> Log Intake
          </button>
          <button type="button" onclick="logoutManagement()" class="bg-red-950/60 hover:bg-red-900 text-red-300 px-3 py-2 rounded-lg text-xs font-semibold border border-red-900/50 cursor-pointer">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </div>

      <!-- Management Tabs -->
      <nav class="bg-gray-900 border border-gray-800 px-3 rounded-xl grid grid-cols-2 sm:flex sm:space-x-4 text-xs sm:text-sm">
        <button type="button" onclick="switchMgmtTab('dashboard')" id="mgmt-nav-dashboard" class="py-3 px-3 border-b-2 border-blue-500 font-medium text-blue-400 flex items-center justify-center space-x-2 transition cursor-pointer">
          <i class="fa-solid fa-chart-pie"></i><span>Dashboard</span>
        </button>
        <button type="button" onclick="switchMgmtTab('farmers')" id="mgmt-nav-farmers" class="py-3 px-3 border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center justify-center space-x-2 transition cursor-pointer">
          <i class="fa-solid fa-users"></i><span>Farmers Directory</span>
        </button>
        <button type="button" onclick="switchMgmtTab('sms')" id="mgmt-nav-sms" class="py-3 px-3 border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center justify-center space-x-2 transition cursor-pointer">
          <i class="fa-solid fa-sms text-emerald-400"></i><span>SMS Broadcast</span>
        </button>
        <button type="button" onclick="switchMgmtTab('admin')" id="mgmt-nav-admin" class="py-3 px-3 border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center justify-center space-x-2 transition cursor-pointer">
          <i class="fa-solid fa-shield-halved text-purple-400"></i><span>Admin Controls</span>
        </button>
      </nav>

      <!-- MGMT TAB 1: DASHBOARD -->
      <div id="mgmt-tab-dashboard" class="space-y-6">
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
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-clock-rotate-left text-blue-400"></i> Recent Collection Logs
            </h3>
            <button onclick="loadManagementData()" class="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300 transition flex items-center gap-1.5 border border-gray-700 cursor-pointer">
              <i class="fa-solid fa-rotate"></i> Refresh
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm text-gray-300">
              <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px]">
                <tr>
                  <th class="px-4 py-3">Farmer</th>
                  <th class="px-4 py-3">Zone</th>
                  <th class="px-4 py-3">Volume (L)</th>
                  <th class="px-4 py-3">Fat %</th>
                  <th class="px-4 py-3">Total (Tsh)</th>
                  <th class="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody id="collectionsTable" class="divide-y divide-gray-800">
                <tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading collection logs...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MGMT TAB 2: FARMERS DIRECTORY -->
      <div id="mgmt-tab-farmers" class="hidden space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-bold text-white">Farmers Directory & Passkeys</h2>
          <button type="button" onclick="openModal('farmerModal')" class="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-2 rounded-lg font-semibold text-white cursor-pointer">Add Farmer</button>
        </div>
        <div class="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm text-gray-300">
              <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px]">
                <tr>
                  <th class="px-4 py-3">ID</th>
                  <th class="px-4 py-3">Name</th>
                  <th class="px-4 py-3">Phone</th>
                  <th class="px-4 py-3">Zone</th>
                  <th class="px-4 py-3">Passkey PIN</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="farmersTableBody" class="divide-y divide-gray-800">
                <tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Loading directory...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MGMT TAB 3: SMS ANNOUNCEMENT BROADCAST -->
      <div id="mgmt-tab-sms" class="hidden space-y-6">
        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow space-y-4">
          <div class="flex items-center space-x-3">
            <div class="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
              <i class="fa-solid fa-paper-plane text-xl"></i>
            </div>
            <div>
              <h2 class="text-sm sm:text-base font-bold text-white">SMS Notification & Announcement Hub</h2>
              <p class="text-xs text-gray-400">Broadcast a single announcement message instantly to all registered farmers.</p>
            </div>
          </div>
          <form onsubmit="handleAnnouncementSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Announcement Message</label>
              <textarea id="announcementMessage" rows="3" required class="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500" placeholder="e.g. Dear farmers, collection time for tomorrow has been shifted to 07:00 AM..."></textarea>
            </div>
            <div class="flex justify-end">
              <button type="submit" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow transition cursor-pointer flex items-center gap-2">
                <i class="fa-solid fa-bullhorn"></i> Broadcast to All Farmers
              </button>
            </div>
          </form>
        </div>

        <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow space-y-3">
          <h3 class="text-sm font-bold text-white">Broadcast History</h3>
          <div id="announcementsHistoryList" class="space-y-2">
            <p class="text-xs text-gray-500">Loading broadcast history...</p>
          </div>
        </div>
      </div>

      <!-- MGMT TAB 4: ADMIN CONTROLS -->
      <div id="mgmt-tab-admin" class="hidden space-y-6">
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
              <i class="fa-solid fa-user-shield"></i> User Role Management (Admin & Sub-Admin)
            </h2>
            <button type="button" onclick="openModal('userModal')" class="bg-purple-600 hover:bg-purple-500 text-xs px-3.5 py-2 rounded-lg font-semibold text-white cursor-pointer">Add Staff User</button>
          </div>
          <p class="text-xs text-gray-400">Create staff login credentials and assign roles (Admin / Sub-Admin / Clerk).</p>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm text-gray-300">
              <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px]">
                <tr>
                  <th class="px-4 py-3">Username</th>
                  <th class="px-4 py-3">Role</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="usersTableBody" class="divide-y divide-gray-800">
                <tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">No users configured.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </section>

  </main>

  <!-- MODAL: ADD FARMER (Restricted to Admin / Sub-Admin) -->
  <div id="farmerModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 id="farmerModalTitle" class="text-base font-bold text-white">Register New Farmer</h3>
        <button type="button" onclick="closeModal('farmerModal')" class="text-gray-400 hover:text-white text-xl p-1 cursor-pointer">&times;</button>
      </div>
      <form id="farmerForm" onsubmit="handleFarmerSubmit(event)" class="space-y-4">
        <input type="hidden" id="editingFarmerId" value="">
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

  <!-- MODAL: STAFF USER -->
  <div id="userModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 id="userModalTitle" class="text-base font-bold text-white">Create Staff User</h3>
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
            <option value="Admin">Admin</option>
            <option value="Sub-Admin">Sub-Admin</option>
            <option value="Clerk">Collection Clerk</option>
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
      { username: 'admin', password: 'password123', role: 'Admin' },
      { username: 'subadmin', password: 'password123', role: 'Sub-Admin' }
    ];
    let loggedInStaff = JSON.parse(localStorage.getItem('logged_in_staff')) || null;
    let cachedFarmers = [];
    let cachedCollections = [];

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('milkPriceInput').value = currentPrice;
      document.getElementById('statPrice').innerHTML = \`\${currentPrice.toLocaleString()} <span class="text-xs text-gray-400">Tsh</span>\`;
      
      if (loggedInStaff) {
        showManagementPortal();
      } else {
        showView('publicHome');
      }
    });

    function showView(viewId) {
      ['publicHome', 'staffLogin', 'managementPortal'].forEach(id => {
        const el = document.getElementById(\`view-\${id}\`);
        if(el) el.classList.add('hidden');
      });
      const target = document.getElementById(\`view-\${viewId}\`);
      if(target) target.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function switchMgmtTab(tabName) {
      ['dashboard', 'farmers', 'sms', 'admin'].forEach(t => {
        const sec = document.getElementById(\`mgmt-tab-\${t}\`);
        const nav = document.getElementById(\`mgmt-nav-\${t}\`);
        if(sec) sec.classList.add('hidden');
        if(nav) {
          nav.classList.remove('border-blue-500', 'text-blue-400', 'text-emerald-400', 'text-purple-400');
          nav.classList.add('border-transparent', 'text-gray-400');
        }
      });
      const activeSec = document.getElementById(\`mgmt-tab-\${tabName}\`);
      const activeNav = document.getElementById(\`mgmt-nav-\${tabName}\`);
      if(activeSec) activeSec.classList.remove('hidden');
      if(activeNav) {
        let activeColor = 'text-blue-400';
        if(tabName === 'sms') activeColor = 'text-emerald-400';
        if(tabName === 'admin') activeColor = 'text-purple-400';
        activeNav.classList.add('border-blue-500', activeColor);
        activeNav.classList.remove('border-transparent', 'text-gray-400');
      }
    }

    // ==================== FARMER PORTAL LOGIN ====================
    async function handleFarmerLogin(e) {
      e.preventDefault();
      const idVal = document.getElementById('loginFarmerId').value.trim();
      const pinVal = document.getElementById('loginPasskey').value.trim();

      try {
        const res = await fetch('/api/farmers');
        const json = await res.json();
        if(!json.success) throw new Error(json.error);

        const farmer = json.data.find(f => String(f.id) === idVal && String(f.passkey) === pinVal);
        if(!farmer) {
          alert('Invalid Farmer ID or Passkey PIN.');
          return;
        }

        // Load farmer contribution details
        const colRes = await fetch('/api/collections');
        const colJson = await colRes.json();
        const farmerCollections = (colJson.data || []).filter(c => String(c.farmer_id) === String(farmer.id));

        const sumLiters = farmerCollections.reduce((acc, c) => acc + Number(c.liters || 0), 0);
        const totalPayout = sumLiters * currentPrice;

        document.getElementById('portalFarmerName').innerText = farmer.name;
        document.getElementById('portalFarmerMeta').innerText = \`ID: #\${farmer.id} | Zone: \${farmer.zone || 'N/A'} | Phone: \${farmer.phone || 'N/A'}\`;
        document.getElementById('portalTotalLiters').innerText = sumLiters.toFixed(1) + ' L';
        document.getElementById('portalTotalPayout').innerText = totalPayout.toLocaleString() + ' Tsh';

        const tbody = document.getElementById('portalCollectionsTable');
        if(farmerCollections.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">No milk deliveries recorded yet.</td></tr>';
        } else {
          tbody.innerHTML = farmerCollections.map(c => \`
            <tr class="hover:bg-gray-800/40">
              <td class="px-4 py-3 font-bold text-emerald-400">\${Number(c.liters).toFixed(1)} L</td>
              <td class="px-4 py-3">\${c.fat_content ? c.fat_content + '%' : '-'}</td>
              <td class="px-4 py-3 font-semibold text-blue-400">\${(Number(c.liters) * currentPrice).toLocaleString()} Tsh</td>
              <td class="px-4 py-3 text-xs text-gray-400">\${new Date(c.collection_date || c.created_at).toLocaleString()}</td>
            </tr>
          \`).join('');
        }

        // Load announcements
        loadPortalAnnouncements();

        document.getElementById('farmerPortalResult').classList.remove('hidden');
      } catch(err) {
        alert('Login error: ' + err.message);
      }
    }

    async function loadPortalAnnouncements() {
      try {
        const res = await fetch('/api/announcements');
        const json = await res.json();
        const list = document.getElementById('portalAnnouncementsList');
        if(json.success && json.data.length > 0) {
          list.innerHTML = json.data.map(a => \`
            <div class="p-2.5 bg-blue-900/20 border border-blue-800/40 rounded-lg">
              <p class="font-medium text-white">\${a.message}</p>
              <span class="text-[10px] text-gray-400">\${new Date(a.created_at).toLocaleString()}</span>
            </div>
          \`).join('');
        } else {
          list.innerHTML = '<p class="text-gray-500">No active announcements.</p>';
        }
      } catch(e) {}
    }

    function logoutFarmerPortal() {
      document.getElementById('farmerPortalResult').classList.add('hidden');
      document.getElementById('loginFarmerId').value = '';
      document.getElementById('loginPasskey').value = '';
    }

    // ==================== STAFF AUTH ====================
    function handleStaffLogin(e) {
      e.preventDefault();
      const u = document.getElementById('staffUsername').value.trim();
      const p = document.getElementById('staffPassword').value.trim();

      const found = systemUsers.find(user => user.username === u && user.password === p);
      if(!found) {
        alert('Invalid staff username or password.');
        return;
      }

      loggedInStaff = found;
      localStorage.setItem('logged_in_staff', JSON.stringify(loggedInStaff));
      showManagementPortal();
    }

    function showManagementPortal() {
      document.getElementById('activeUserName').innerText = loggedInStaff.username;
      document.getElementById('activeUserBadge').innerText = 'Role: ' + loggedInStaff.role;
      showView('managementPortal');
      loadManagementData();
      renderUsersTable();
      loadAnnouncementsHistory();
    }

    function logoutManagement() {
      loggedInStaff = null;
      localStorage.removeItem('logged_in_staff');
      showView('publicHome');
    }

    // ==================== MANAGEMENT DATA ====================
    async function loadManagementData() {
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

        if (!farmersData.success) throw new Error(farmersData.error);
        if (!collectionsData.success) throw new Error(collectionsData.error);

        cachedFarmers = farmersData.data || [];
        cachedCollections = collectionsData.data || [];

        document.getElementById('totalFarmers').innerText = cachedFarmers.length;
        const sumLiters = cachedCollections.reduce((acc, c) => acc + Number(c.liters || 0), 0);
        document.getElementById('totalLiters').innerHTML = \`\${sumLiters.toFixed(1)} <span class="text-base font-normal text-gray-400">L</span>\`;

        // Populate dropdown for logging intake
        const selectEl = document.getElementById('collectionFarmerId');
        selectEl.innerHTML = '<option value="">Select a farmer...</option>';
        cachedFarmers.forEach(f => {
          selectEl.innerHTML += \`<option value="\${f.id}">#\${f.id} - \${f.name} (\${f.zone || 'No Zone'})\</option>\`;
        });

        // Farmers Directory table with Passkey
        const farmersTableBody = document.getElementById('farmersTableBody');
        if (cachedFarmers.length === 0) {
          farmersTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No registered farmers yet.</td></tr>';
        } else {
          farmersTableBody.innerHTML = cachedFarmers.map(f => \`
            <tr class="hover:bg-gray-800/40 transition">
              <td class="px-4 py-3 text-gray-400 font-mono">#\${f.id}</td>
              <td class="px-4 py-3 font-semibold text-white">\${f.name}</td>
              <td class="px-4 py-3 text-gray-400">\${f.phone || 'No phone'}</td>
              <td class="px-4 py-3"><span class="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">\${f.zone || 'Unassigned'}</span></td>
              <td class="px-4 py-3"><span class="bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded text-xs font-mono font-bold">\${f.passkey || '----'}</span></td>
              <td class="px-4 py-3 text-right space-x-1">
                \${loggedInStaff && (loggedInStaff.role === 'Admin' || loggedInStaff.role === 'Sub-Admin') ? \`
                  <button onclick="editFarmer(\${f.id})" class="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-950/40 rounded border border-blue-900/50 cursor-pointer"><i class="fa-solid fa-pen"></i></button>
                  <button onclick="deleteFarmer(\${f.id})" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-950/40 rounded border border-red-900/50 cursor-pointer"><i class="fa-solid fa-trash"></i></button>
                \` : '<span class="text-xs text-gray-500">View Only</span>'}
              </td>
            </tr>
          \`).join('');
        }

        renderIntakesTable(cachedCollections.slice(0, 10), document.getElementById('collectionsTable'));

      } catch (err) {
        if(errorBanner && errorMessage) {
          errorMessage.innerText = 'Database Error: ' + err.message;
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
            <td class="px-4 py-3 font-semibold text-white">\${farmerName}</td>
            <td class="px-4 py-3 text-xs text-gray-400">\${farmerZone}</td>
            <td class="px-4 py-3 font-bold text-emerald-400">\${liters.toFixed(1)} L</td>
            <td class="px-4 py-3">\${c.fat_content ? c.fat_content + '%' : '-'}</td>
            <td class="px-4 py-3 font-semibold text-blue-400">\${totalPayout.toLocaleString()} Tsh</td>
            <td class="px-4 py-3 text-xs text-gray-400">\${new Date(c.collection_date || c.created_at).toLocaleString()}</td>
          </tr>
        \`;
      }).join('');
    }

    // ==================== FARMER ACTIONS (Admin & Sub-Admin Only) ====================
    function openModal(id) {
      if (id === 'farmerModal') {
        if (!loggedInStaff || (loggedInStaff.role !== 'Admin' && loggedInStaff.role !== 'Sub-Admin')) {
          alert('Permission denied. Only Admin and Sub-Admin can register or modify farmers.');
          return;
        }
        document.getElementById('editingFarmerId').value = '';
        document.getElementById('farmerModalTitle').innerText = 'Register New Farmer';
        document.getElementById('farmerForm').reset();
      }
      const modal = document.getElementById(id);
      if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }

    function closeModal(id) {
      const modal = document.getElementById(id);
      if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    async function handleFarmerSubmit(e) {
      e.preventDefault();
      const id = document.getElementById('editingFarmerId').value;
      const name = document.getElementById('farmerName').value;
      const phone = document.getElementById('farmerPhone').value;
      const zone = document.getElementById('farmerZone').value;

      try {
        let res, json;
        if (!id) {
          // Generate random 4-digit PIN passkey
          const passkey = Math.floor(1000 + Math.random() * 9000).toString();
          res = await fetch('/api/farmers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, zone, passkey })
          });
          json = await res.json();
          if(!json.success) throw new Error(json.error);
          alert(\`Farmer registered successfully!\\n\\nGenerated 4-Pin Passkey: \${passkey}\\n(Please share this PIN with the farmer for portal login)\`);
        } else {
          res = await fetch(\`/api/farmers/\${id}\`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, zone })
          });
          json = await res.json();
          if(!json.success) throw new Error(json.error);
          alert('Farmer updated successfully!');
        }

        document.getElementById('farmerForm').reset();
        closeModal('farmerModal');
        loadManagementData();
      } catch(err) {
        alert('Error saving farmer: ' + err.message);
      }
    }

    function editFarmer(id) {
      if (!loggedInStaff || (loggedInStaff.role !== 'Admin' && loggedInStaff.role !== 'Sub-Admin')) {
        alert('Permission denied.');
        return;
      }
      const farmer = cachedFarmers.find(f => f.id === id);
      if(!farmer) return;
      document.getElementById('editingFarmerId').value = farmer.id;
      document.getElementById('farmerName').value = farmer.name;
      document.getElementById('farmerPhone').value = farmer.phone || '';
      document.getElementById('farmerZone').value = farmer.zone || '';
      document.getElementById('farmerModalTitle').innerText = 'Modify Farmer Details';
      openModal('farmerModal');
    }

    async function deleteFarmer(id) {
      if (!loggedInStaff || (loggedInStaff.role !== 'Admin' && loggedInStaff.role !== 'Sub-Admin')) {
        alert('Permission denied.');
        return;
      }
      if (confirm('Are you sure you want to delete this farmer and all their collection logs?')) {
        try {
          const res = await fetch(\`/api/farmers/\${id}\`, { method: 'DELETE' });
          const json = await res.json();
          if(!json.success) throw new Error(json.error);
          loadManagementData();
        } catch(err) {
          alert('Error deleting farmer: ' + err.message);
        }
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
        loadManagementData();
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
        loadManagementData();
      } else {
        alert('Please enter a valid price.');
      }
    }

    // ==================== SMS ANNOUNCEMENTS ====================
    async function handleAnnouncementSubmit(e) {
      e.preventDefault();
      const message = document.getElementById('announcementMessage').value;
      const sender = loggedInStaff ? loggedInStaff.username : 'Admin';

      try {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, sender })
        });
        const json = await res.json();
        if(!json.success) throw new Error(json.error);

        document.getElementById('announcementMessage').value = '';
        alert('Announcement broadcasted successfully to all farmers!');
        loadAnnouncementsHistory();
      } catch(err) {
        alert('Error broadcasting announcement: ' + err.message);
      }
    }

    async function loadAnnouncementsHistory() {
      try {
        const res = await fetch('/api/announcements');
        const json = await res.json();
        const container = document.getElementById('announcementsHistoryList');
        if(json.success && json.data.length > 0) {
          container.innerHTML = json.data.map(a => \`
            <div class="p-3 bg-gray-950 border border-gray-800 rounded-lg flex justify-between items-start">
              <div>
                <p class="text-xs text-white font-medium">\${a.message}</p>
                <span class="text-[10px] text-gray-400">By \${a.sender} on \${new Date(a.created_at).toLocaleString()}</span>
              </div>
            </div>
          \`).join('');
        } else {
          container.innerHTML = '<p class="text-xs text-gray-500">No announcements broadcasted yet.</p>';
        }
      } catch(e) {}
    }

    function renderUsersTable() {
      const tbody = document.getElementById('usersTableBody');
      if (!tbody) return;
      if (systemUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">No staff users configured.</td></tr>';
        return;
      }
      tbody.innerHTML = systemUsers.map((u, index) => \`
        <tr class="hover:bg-gray-800/40 transition">
          <td class="px-4 py-3 font-medium text-white">\${u.username}</td>
          <td class="px-4 py-3"><span class="bg-purple-950 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded text-xs font-semibold">\${u.role}</span></td>
          <td class="px-4 py-3 text-right space-x-1">
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
      document.getElementById('userModalTitle').innerText = 'Modify Staff User';
      openModal('userModal');
    }

    function deleteUser(index) {
      if (confirm('Are you sure you want to delete this staff user?')) {
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

// ==================== FARMERS API ====================
app.get('/api/farmers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('farmers')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/farmers', async (req, res) => {
  try {
    const { name, phone, zone, passkey } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Farmer name is required' });

    const { data, error } = await supabase
      .from('farmers')
      .insert([{ name, phone, zone, passkey: passkey || '1234' }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/farmers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, zone } = req.body;

    const { data, error } = await supabase
      .from('farmers')
      .update({ name, phone, zone })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/farmers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('farmers').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== COLLECTIONS API ====================
app.get('/api/collections', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select(`
        *,
        farmers (id, name, phone, zone)
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

// ==================== ANNOUNCEMENTS / SMS BROADCAST API ====================
app.get('/api/announcements', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const { message, sender } = req.body;
    if (!message) return res.status(0).json({ success: false, error: 'Message required' });

    const { data, error } = await supabase
      .from('announcements')
      .insert([{ message, sender: sender || 'Admin' }])
      .select();

    if (error) throw error;
    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Milk Collection Hub running on port ${PORT}`);
});
