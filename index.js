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
  <!-- SheetJS for Excel/CSV Exports -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
</head>
<body id="appBody" class="bg-gray-950 text-gray-100 min-h-screen flex flex-col font-sans antialiased pb-20 transition-colors duration-200">

  <!-- TOP HEADER -->
  <header id="appHeader" class="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex justify-between items-center shadow-lg transition-colors duration-200">
    <div class="flex items-center space-x-3">
      <div class="bg-blue-600 p-2.5 rounded-xl text-white shadow-md shadow-blue-900/40">
        <i class="fa-solid fa-bucket text-lg"></i>
      </div>
      <div>
        <h1 class="text-base sm:text-lg font-bold tracking-wide">Milk Collection Hub</h1>
        <p class="text-[11px] text-gray-400">Management & Farmer Portal</p>
      </div>
    </div>
    <div class="flex items-center space-x-2">
      <!-- Theme Toggle Switch -->
      <button onclick="toggleTheme()" class="bg-gray-800 hover:bg-gray-700 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-gray-700 cursor-pointer flex items-center gap-1.5">
        <i id="themeIcon" class="fa-solid fa-sun"></i> <span id="themeText" class="hidden sm:inline">Theme</span>
      </button>
      <div id="headerAuthActions" class="flex items-center space-x-2">
        <button onclick="showView('publicHome')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-gray-700 cursor-pointer">
          <i class="fa-solid fa-user text-emerald-400"></i> Farmer Portal
        </button>
        <button onclick="showView('staffLogin')" id="staffLoginNavBtn" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow cursor-pointer">
          <i class="fa-solid fa-lock text-white"></i> Staff / Admin Login
        </button>
        <button onclick="logoutManagement()" id="headerLogoutBtn" class="hidden bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow cursor-pointer flex items-center gap-1.5">
          <i class="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>
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
      <div class="max-w-md mx-auto card-theme border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5 bg-gray-900">
        <div class="text-center space-y-1">
          <div class="inline-block bg-emerald-500/10 text-emerald-400 p-3 rounded-full mb-1">
            <i class="fa-solid fa-id-card text-2xl"></i>
          </div>
          <h2 class="text-lg font-bold">Farmer Contribution Portal</h2>
          <p class="text-xs text-gray-400">Enter your Farmer ID (starting with kmk00) and 4-digit Passkey to view deliveries.</p>
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

      <!-- Farmer Portal Dashboard Result -->
      <div id="farmerPortalResult" class="hidden space-y-6">
        <div class="card-theme border border-gray-800 rounded-2xl p-5 flex justify-between items-center shadow bg-gray-900">
          <div>
            <span class="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Welcome Farmer</span>
            <h2 id="portalFarmerName" class="text-xl font-extrabold">--</h2>
            <p id="portalFarmerMeta" class="text-xs text-gray-400">ID: -- | Zone: --</p>
          </div>
          <button onclick="logoutFarmerPortal()" class="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-2 rounded-lg cursor-pointer border border-gray-700">Exit Portal</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="card-theme border border-gray-800 p-5 rounded-2xl shadow bg-gray-900">
            <p class="text-xs font-semibold text-gray-400 uppercase">Total Milk Delivered</p>
            <h2 id="portalTotalLiters" class="text-2xl font-extrabold text-emerald-400 mt-1">0 L</h2>
          </div>
          <div class="card-theme border border-gray-800 p-5 rounded-2xl shadow bg-gray-900">
            <p class="text-xs font-semibold text-gray-400 uppercase">Total Earned Payout</p>
            <h2 id="portalTotalPayout" class="text-2xl font-extrabold text-blue-400 mt-1">0 Tsh</h2>
          </div>
        </div>

        <!-- Latest Broadcast Announcements -->
        <div class="bg-blue-950/30 border border-blue-900/50 rounded-2xl p-4 space-y-2">
          <h3 class="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-bullhorn"></i> Announcements & Broadcasts
          </h3>
          <div id="portalAnnouncementsList" class="text-xs text-gray-300 space-y-1">
            <p class="text-gray-500">No recent announcements.</p>
          </div>
        </div>

        <div class="card-theme border border-gray-800 rounded-2xl overflow-hidden shadow bg-gray-900">
          <div class="px-5 py-4 border-b border-gray-800">
            <h3 class="text-sm font-bold">Your Delivery History</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
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
      <div class="max-w-md mx-auto card-theme border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5 bg-gray-900">
        <div class="text-center space-y-1">
          <div class="inline-block bg-blue-500/10 text-blue-400 p-3 rounded-full mb-1">
            <i class="fa-solid fa-shield-halved text-2xl"></i>
          </div>
          <h2 class="text-lg font-bold">Staff & Admin Authentication</h2>
          <p class="text-xs text-gray-400">Log in with your system credentials to access management controls.</p>
        </div>
        <form onsubmit="handleStaffLogin(event)" class="space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1">Username</label>
            <input type="text" id="staffUsername" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="admin">
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Password</label>
            <input type="password" id="staffPassword" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="••••••••">
          </div>
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg text-xs transition cursor-pointer shadow">Authenticate Admin / Staff</button>
        </form>
      </div>
    </section>

    <!-- VIEW 3: FULL MANAGEMENT PORTAL -->
    <section id="view-managementPortal" class="hidden space-y-6">
      
      <!-- Management Sub-Header Bar -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 card-theme border border-gray-800 p-4 rounded-2xl shadow bg-gray-900">
        <div class="flex items-center gap-3">
          <div class="bg-purple-600/20 text-purple-400 p-2.5 rounded-xl">
            <i class="fa-solid fa-user-gear text-lg"></i>
          </div>
          <div>
            <span id="activeUserBadge" class="bg-purple-950 text-purple-300 border border-purple-800/50 px-2 py-0.5 rounded text-[10px] font-bold">Role: Admin</span>
            <h2 id="activeUserName" class="text-sm font-bold mt-0.5">Logged in Staff</h2>
          </div>
        </div>
        <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button type="button" onclick="openModal('farmerModal')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-gray-700 cursor-pointer">
            <i class="fa-solid fa-user-plus text-blue-400"></i> New Farmer
          </button>
          <button type="button" onclick="openModal('collectionModal')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer">
            <i class="fa-solid fa-plus"></i> Log Intake
          </button>
          <button type="button" onclick="logoutManagement()" class="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow cursor-pointer">
            <i class="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        </div>
      </div>

      <!-- Management Tabs -->
      <nav class="card-theme border border-gray-800 px-3 rounded-xl grid grid-cols-2 sm:flex sm:space-x-4 text-xs sm:text-sm bg-gray-900">
        <button type="button" onclick="switchMgmtTab('dashboard')" id="mgmt-nav-dashboard" class="py-3 px-3 border-b-2 border-blue-500 font-medium text-blue-400 flex items-center justify-center space-x-2 transition cursor-pointer">
          <i class="fa-solid fa-chart-pie"></i><span>Dashboard</span>
        </button>
        <button type="button" onclick="switchMgmtTab('farmers')" id="mgmt-nav-farmers" class="py-3 px-3 border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center justify-center space-x-2 transition cursor-pointer">
          <i class="fa-solid fa-users"></i><span>Farmers Directory</span>
        </button>
        <button type="button" onclick="switchMgmtTab('reports')" id="mgmt-nav-reports" class="py-3 px-3 border-b-2 border-transparent text-gray-400 hover:text-gray-200 flex items-center justify-center space-x-2 transition cursor-pointer">
          <i class="fa-solid fa-file-excel text-emerald-400"></i><span>Reports & Export</span>
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
          <div class="card-theme border border-gray-800 p-5 rounded-2xl flex items-center justify-between shadow bg-gray-900">
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered Farmers</p>
              <h2 id="totalFarmers" class="text-3xl font-extrabold mt-1">0</h2>
            </div>
            <div class="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
              <i class="fa-solid fa-users text-2xl"></i>
            </div>
          </div>

          <div class="card-theme border border-gray-800 p-5 rounded-2xl flex items-center justify-between shadow bg-gray-900">
            <div>
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Milk Intake</p>
              <h2 id="totalLiters" class="text-3xl font-extrabold text-emerald-400 mt-1">0 <span class="text-base font-normal text-gray-400">L</span></h2>
            </div>
            <div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <i class="fa-solid fa-glass-water text-2xl"></i>
            </div>
          </div>

          <div class="card-theme border border-gray-800 p-5 rounded-2xl flex items-center justify-between shadow bg-gray-900">
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
        <div class="card-theme border border-gray-800 rounded-2xl overflow-hidden shadow bg-gray-900">
          <div class="px-5 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
            <h3 class="text-sm font-bold flex items-center gap-2">
              <i class="fa-solid fa-clock-rotate-left text-blue-400"></i> Recent Collection Logs
            </h3>
            <button onclick="loadManagementData()" class="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-300 transition flex items-center gap-1.5 border border-gray-700 cursor-pointer">
              <i class="fa-solid fa-rotate"></i> Refresh
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
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
          <h2 class="text-lg font-bold">Farmers Directory & Passkeys</h2>
          <button type="button" onclick="openModal('farmerModal')" class="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-2 rounded-lg font-semibold text-white cursor-pointer">Add Farmer</button>
        </div>
        <div class="card-theme border border-gray-800 rounded-2xl overflow-hidden shadow bg-gray-900">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
              <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px]">
                <tr>
                  <th class="px-4 py-3">Farmer ID</th>
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

      <!-- MGMT TAB 3: REPORTS & EXPORT -->
      <div id="mgmt-tab-reports" class="hidden space-y-6">
        <div class="card-theme border border-gray-800 rounded-2xl p-5 sm:p-6 shadow space-y-4 bg-gray-900">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-4">
            <div>
              <h2 class="text-base font-bold flex items-center gap-2">
                <i class="fa-solid fa-file-invoice-dollar text-emerald-400"></i> Milk Collection Reports & Analytics
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">Filter by date ranges, search specific farmers, view raw/column tables, and export data.</p>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <button onclick="exportReportsExcel()" class="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition cursor-pointer flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-file-excel"></i> Export Excel
              </button>
              <button onclick="exportReportsCSV()" class="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition cursor-pointer flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-file-csv"></i> Export CSV
              </button>
            </div>
          </div>

          <!-- Filter Controls -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Search Farmer / ID</label>
              <input type="text" id="reportSearchInput" oninput="renderReportsTable()" placeholder="e.g. Juma or KMK..." class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Date Interval Filter</label>
              <select id="reportIntervalSelect" onchange="renderReportsTable()" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                <option value="all">All Time Records</option>
                <option value="weekly">This Week (Last 7 Days)</option>
                <option value="monthly">This Month</option>
                <option value="yearly">This Year</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Specific Farmer Target</label>
              <select id="reportFarmerSelect" onchange="renderReportsTable()" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                <option value="all">All Farmers Combined</option>
              </select>
            </div>
            <div class="flex items-end">
              <button onclick="resetReportFilters()" class="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold py-2 rounded-lg border border-gray-700 cursor-pointer">Reset Filters</button>
            </div>
          </div>
        </div>

        <!-- Reports Summary Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="card-theme border border-gray-800 p-4 rounded-xl bg-gray-900 shadow">
            <p class="text-xs text-gray-400 uppercase font-semibold">Filtered Total Volume</p>
            <h3 id="reportTotalVol" class="text-xl font-extrabold text-emerald-400 mt-1">0 L</h3>
          </div>
          <div class="card-theme border border-gray-800 p-4 rounded-xl bg-gray-900 shadow">
            <p class="text-xs text-gray-400 uppercase font-semibold">Filtered Total Payout</p>
            <h3 id="reportTotalPayout" class="text-xl font-extrabold text-blue-400 mt-1">0 Tsh</h3>
          </div>
          <div class="card-theme border border-gray-800 p-4 rounded-xl bg-gray-900 shadow">
            <p class="text-xs text-gray-400 uppercase font-semibold">Total Entries Count</p>
            <h3 id="reportTotalCount" class="text-xl font-extrabold text-purple-400 mt-1">0 Records</h3>
          </div>
        </div>

        <!-- Reports Raw Data Table -->
        <div class="card-theme border border-gray-800 rounded-2xl overflow-hidden shadow bg-gray-900">
          <div class="px-5 py-3 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-300">Detailed Rows & Columns Records</h3>
            <span id="reportRowCountBadge" class="text-[10px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded">0 Rows</span>
          </div>
          <div class="overflow-x-auto max-h-[500px]">
            <table class="w-full text-left text-xs sm:text-sm">
              <thead class="bg-gray-800/40 uppercase text-gray-400 border-b border-gray-800 text-[11px] sticky top-0 z-10">
                <tr>
                  <th class="px-4 py-3">Date & Time</th>
                  <th class="px-4 py-3">Farmer ID</th>
                  <th class="px-4 py-3">Farmer Name</th>
                  <th class="px-4 py-3">Zone</th>
                  <th class="px-4 py-3">Volume (L)</th>
                  <th class="px-4 py-3">Fat %</th>
                  <th class="px-4 py-3">Rate (Tsh)</th>
                  <th class="px-4 py-3">Total Payout (Tsh)</th>
                </tr>
              </thead>
              <tbody id="reportsTableBody" class="divide-y divide-gray-800">
                <tr><td colspan="8" class="px-4 py-6 text-center text-gray-500">Select parameters to load report data...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MGMT TAB 4: SMS ANNOUNCEMENT BROADCAST -->
      <div id="mgmt-tab-sms" class="hidden space-y-6">
        <div class="card-theme border border-gray-800 rounded-2xl p-5 sm:p-6 shadow space-y-4 bg-gray-900">
          <div class="flex items-center space-x-3">
            <div class="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl">
              <i class="fa-solid fa-paper-plane text-xl"></i>
            </div>
            <div>
              <h2 class="text-sm sm:text-base font-bold">SMS Notification & Announcement Hub</h2>
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

        <div class="card-theme border border-gray-800 rounded-2xl p-5 shadow space-y-3 bg-gray-900">
          <h3 class="text-sm font-bold">Broadcast History</h3>
          <div id="announcementsHistoryList" class="space-y-2">
            <p class="text-xs text-gray-500">Loading broadcast history...</p>
          </div>
        </div>
      </div>

      <!-- MGMT TAB 5: ADMIN CONTROLS -->
      <div id="mgmt-tab-admin" class="hidden space-y-6">
        <div class="card-theme border border-gray-800 rounded-2xl p-5 sm:p-6 shadow space-y-4 bg-gray-900">
          <h2 class="text-sm sm:text-base font-bold text-blue-400 flex items-center gap-2">
            <i class="fa-solid fa-coins"></i> Milk Price Configuration
          </h2>
          <p class="text-xs text-gray-400">Set standard price per litre used for automated payout calculations.</p>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input type="number" id="milkPriceInput" placeholder="e.g. 1000" class="bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-lg text-sm w-full sm:w-48 text-white focus:outline-none focus:border-blue-500">
            <button type="button" onclick="saveMilkPrice()" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow transition cursor-pointer">Save Price</button>
          </div>
        </div>

        <div class="card-theme border border-gray-800 rounded-2xl p-5 sm:p-6 shadow space-y-4 bg-gray-900">
          <div class="flex justify-between items-center">
            <h2 class="text-sm sm:text-base font-bold text-purple-400 flex items-center gap-2">
              <i class="fa-solid fa-user-shield"></i> User Role Management (Admin & Sub-Admin)
            </h2>
            <button type="button" onclick="openModal('userModal')" class="bg-purple-600 hover:bg-purple-500 text-xs px-3.5 py-2 rounded-lg font-semibold text-white cursor-pointer">Add Staff User</button>
          </div>
          <p class="text-xs text-gray-400">Create staff login credentials and assign roles. Note: Sub-admins cannot delete or modify the main admin account.</p>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
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

  <!-- MODAL: ADD FARMER -->
  <div id="farmerModal" class="fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="card-theme border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl bg-gray-900">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 id="farmerModalTitle" class="text-base font-bold">Register New Farmer</h3>
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
    <div class="card-theme border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl bg-gray-900">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 class="text-base font-bold">Log Milk Intake</h3>
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
    <div class="card-theme border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl bg-gray-900">
      <div class="flex justify-between items-center border-b border-gray-800 pb-3">
        <h3 id="userModalTitle" class="text-base font-bold">Create Staff User</h3>
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
    let currentTheme = localStorage.getItem('app_theme') || 'dark';

    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(currentTheme);
      document.getElementById('milkPriceInput').value = currentPrice;
      document.getElementById('statPrice').innerHTML = \`\${currentPrice.toLocaleString()} <span class="text-xs text-gray-400">Tsh</span>\`;
      
      if (loggedInStaff && loggedInStaff.username) {
        showManagementPortal();
      } else {
        showView('publicHome');
      }
    });

    function toggleTheme() {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('app_theme', currentTheme);
      applyTheme(currentTheme);
    }

    function applyTheme(theme) {
      const body = document.getElementById('appBody');
      const header = document.getElementById('appHeader');
      const icon = document.getElementById('themeIcon');
      
      if (theme === 'light') {
        body.className = "bg-slate-100 text-slate-800 min-h-screen flex flex-col font-sans antialiased pb-20 transition-colors duration-200";
        header.className = "bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex justify-between items-center shadow transition-colors duration-200";
        icon.className = "fa-solid fa-moon text-blue-600";
      } else {
        body.className = "bg-gray-950 text-gray-100 min-h-screen flex flex-col font-sans antialiased pb-20 transition-colors duration-200";
        header.className = "bg-gray-900 border-b border-gray-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex justify-between items-center shadow transition-colors duration-200";
        icon.className = "fa-solid fa-sun text-yellow-400";
      }
    }

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
      ['dashboard', 'farmers', 'reports', 'sms', 'admin'].forEach(t => {
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
        if(tabName === 'sms' || tabName === 'reports') activeColor = 'text-emerald-400';
        if(tabName === 'admin') activeColor = 'text-purple-400';
        activeNav.classList.add('border-blue-500', activeColor);
        activeNav.classList.remove('border-transparent', 'text-gray-400');
      }
      if(tabName === 'reports') {
        renderReportsTable();
      }
    }

    // ==================== FARMER PORTAL LOGIN ====================
    async function handleFarmerLogin(e) {
      e.preventDefault();
      const idVal = document.getElementById('loginFarmerId').value.trim().toUpperCase();
      const pinVal = document.getElementById('loginPasskey').value.trim();

      try {
        const res = await fetch(\`/api/farmers/login\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmer_id: idVal, passkey: pinVal })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || 'Invalid credentials');

        document.getElementById('portalFarmerName').innerText = data.farmer.name;
        document.getElementById('portalFarmerMeta').innerText = \`ID: \${data.farmer.farmer_id} | Zone: \${data.farmer.zone || 'N/A'}\`;
        
        let totalL = 0;
        let totalP = 0;
        const tbody = document.getElementById('portalCollectionsTable');
        tbody.innerHTML = '';

        if(data.collections && data.collections.length > 0) {
          data.collections.forEach(c => {
            totalL += parseFloat(c.liters || 0);
            totalP += parseFloat(c.total_amount || 0);
            tbody.innerHTML += \`
              <tr>
                <td class="px-4 py-3 font-semibold text-emerald-400">\${c.liters} L</td>
                <td class="px-4 py-3">\${c.fat_percentage ? c.fat_percentage + '%' : '--'}</td>
                <td class="px-4 py-3 font-semibold text-blue-400">\${parseFloat(c.total_amount || 0).toLocaleString()} Tsh</td>
                <td class="px-4 py-3 text-gray-400 text-xs">\${new Date(c.created_at).toLocaleString()}</td>
              </tr>
            \`;
          });
        } else {
          tbody.innerHTML = \`<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">No milk deliveries recorded yet.</td></tr>\`;
        }

        document.getElementById('portalTotalLiters').innerText = totalL.toFixed(1) + ' L';
        document.getElementById('portalTotalPayout').innerText = totalP.toLocaleString() + ' Tsh';

        // Load announcements
        loadPortalAnnouncements();

        document.querySelector('#view-publicHome form').classList.add('hidden');
        document.getElementById('farmerPortalResult').classList.remove('hidden');
      } catch(err) {
        alert(err.message);
      }
    }

    function logoutFarmerPortal() {
      document.querySelector('#view-publicHome form').reset();
      document.querySelector('#view-publicHome form').classList.remove('hidden');
      document.getElementById('farmerPortalResult').classList.add('hidden');
    }

    async function loadPortalAnnouncements() {
      try {
        const res = await fetch('/api/announcements');
        const data = await res.json();
        const listDiv = document.getElementById('portalAnnouncementsList');
        if(data && data.length > 0) {
          listDiv.innerHTML = data.slice(0,3).map(a => \`
            <div class="p-2 bg-blue-950/40 rounded border border-blue-900/40 mb-1">
              <p class="text-xs text-gray-200">\${a.message}</p>
              <span class="text-[10px] text-gray-400">\${new Date(a.created_at).toLocaleDateString()}</span>
            </div>
          \`).join('');
        } else {
          listDiv.innerHTML = \`<p class="text-gray-500">No recent announcements.</p>\`;
        }
      } catch(e) {}
    }

    // ==================== STAFF & ADMIN LOGIN ====================
    function handleStaffLogin(e) {
      e.preventDefault();
      const u = document.getElementById('staffUsername').value.trim();
      const p = document.getElementById('staffPassword').value.trim();

      const found = systemUsers.find(x => x.username === u && x.password === p);
      if(found) {
        loggedInStaff = found;
        localStorage.setItem('logged_in_staff', JSON.stringify(loggedInStaff));
        showManagementPortal();
      } else {
        alert('Invalid username or password credentials.');
      }
    }

    function showManagementPortal() {
      document.getElementById('staffLoginNavBtn').classList.add('hidden');
      document.getElementById('headerLogoutBtn').classList.remove('hidden');
      document.getElementById('activeUserName').innerText = loggedInStaff.username;
      document.getElementById('activeUserBadge').innerText = \`Role: \${loggedInStaff.role}\`;
      showView('managementPortal');
      loadManagementData();
    }

    function logoutManagement() {
      loggedInStaff = null;
      localStorage.removeItem('logged_in_staff');
      document.getElementById('staffLoginNavBtn').classList.remove('hidden');
      document.getElementById('headerLogoutBtn').classList.add('hidden');
      showView('publicHome');
    }

    // ==================== LOAD MANAGEMENT DATA ====================
    async function loadManagementData() {
      try {
        const res = await fetch('/api/management/data');
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);

        cachedFarmers = data.farmers || [];
        cachedCollections = data.collections || [];

        // Update dashboard stats
        document.getElementById('totalFarmers').innerText = cachedFarmers.length;
        let sumL = cachedCollections.reduce((acc, c) => acc + parseFloat(c.liters || 0), 0);
        document.getElementById('totalLiters', true);
        document.getElementById('totalLiters').innerHTML = sumL.toFixed(1) + ' <span class="text-base font-normal text-gray-400">L</span>';

        // Populate recent collections table
        const colTable = document.getElementById('collectionsTable');
        if(cachedCollections.length > 0) {
          colTable.innerHTML = cachedCollections.slice(0, 10).map(c => \`
            <tr>
              <td class="px-4 py-3 font-medium">\${c.farmers ? c.farmers.name : c.farmer_id}</td>
              <td class="px-4 py-3 text-gray-400">\${c.farmers ? (c.farmers.zone || '--') : '--'}</td>
              <td class="px-4 py-3 font-semibold text-emerald-400">\${c.liters} L</td>
              <td class="px-4 py-3">\${c.fat_percentage ? c.fat_percentage + '%' : '--'}</td>
              <td class="px-4 py-3 font-semibold text-blue-400">\${parseFloat(c.total_amount || 0).toLocaleString()} Tsh</td>
              <td class="px-4 py-3 text-gray-400 text-xs">\${new Date(c.created_at).toLocaleString()}</td>
            </tr>
          \`).join('');
        } else {
          colTable.innerHTML = \`<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No collection records found.</td></tr>\`;
        }

        // Populate farmers table directory
        const farmTable = document.getElementById('farmersTableBody');
        const selectFarmer = document.getElementById('collectionFarmerId');
        const reportFarmerSelect = document.getElementById('reportFarmerSelect');

        selectFarmer.innerHTML = '<option value="">Select a farmer...</option>';
        reportFarmerSelect.innerHTML = '<option value="all">All Farmers Combined</option>';

        if(cachedFarmers.length > 0) {
          farmTable.innerHTML = cachedFarmers.map(f => {
            selectFarmer.innerHTML += \`<option value="\${f.farmer_id}">\${f.name} (\${f.farmer_id})</option>\`;
            reportFarmerSelect.innerHTML += \`<option value="\${f.farmer_id}">\${f.name} (\${f.farmer_id})</option>\`;
            return \`
              <tr>
                <td class="px-4 py-3 font-mono text-emerald-400">\${f.farmer_id}</td>
                <td class="px-4 py-3 font-medium">\${f.name}</td>
                <td class="px-4 py-3 text-gray-400">\${f.phone || '--'}</td>
                <td class="px-4 py-3 text-gray-400">\${f.zone || '--'}</td>
                <td class="px-4 py-3 font-mono text-blue-400">\${f.passkey}</td>
                <td class="px-4 py-3 text-right space-x-2">
                  <button onclick="editFarmer('\${f.farmer_id}')" class="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                  <button onclick="deleteFarmer('\${f.farmer_id}')" class="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </td>
              </tr>
            \`;
          }).join('');
        } else {
          farmTable.innerHTML = \`<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No registered farmers.</td></tr>\`;
        }

        // Populate users table
        renderUsersTable();
        loadAnnouncementsHistory();

      } catch(err) {
        showError(err.message);
      }
    }

    // ==================== REPORTS & EXPORT FUNCTIONS ====================
    function renderReportsTable() {
      const searchTxt = document.getElementById('reportSearchInput').value.toLowerCase();
      const interval = document.getElementById('reportIntervalSelect').value;
      const farmerFilter = document.getElementById('reportFarmerSelect').value;

      const now = new Date();
      let filtered = cachedCollections.filter(c => {
        const farmerObj = c.farmers || cachedFarmers.find(f => f.farmer_id === c.farmer_id) || {};
        const nameMatch = (farmerObj.name || '').toLowerCase().includes(searchTxt) || c.farmer_id.toLowerCase().includes(searchTxt);
        const farmerMatch = (farmerFilter === 'all' || c.farmer_id === farmerFilter);
        
        let dateMatch = true;
        const cDate = new Date(c.created_at);
        if (interval === 'weekly') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          dateMatch = cDate >= oneWeekAgo;
        } else if (interval === 'monthly') {
          dateMatch = cDate.getMonth() === now.getMonth() && cDate.getFullYear() === now.getFullYear();
        } else if (interval === 'yearly') {
          dateMatch = cDate.getFullYear() === now.getFullYear();
        }

        return nameMatch && farmerMatch && dateMatch;
      });

      let totalVol = 0;
      let totalPay = 0;
      const tbody = document.getElementById('reportsTableBody');

      if(filtered.length > 0) {
        tbody.innerHTML = filtered.map(c => {
          const farmerObj = c.farmers || cachedFarmers.find(f => f.farmer_id === c.farmer_id) || {};
          totalVol += parseFloat(c.liters || 0);
          totalPay += parseFloat(c.total_amount || 0);
          return \`
            <tr>
              <td class="px-4 py-3 text-gray-300">\${new Date(c.created_at).toLocaleString()}</td>
              <td class="px-4 py-3 font-mono text-emerald-400">\${c.farmer_id}</td>
              <td class="px-4 py-3 font-medium">\${farmerObj.name || 'Unknown'}</td>
              <td class="px-4 py-3 text-gray-400">\${farmerObj.zone || '--'}</td>
              <td class="px-4 py-3 font-semibold text-emerald-400">\${c.liters} L</td>
              <td class="px-4 py-3">\${c.fat_percentage ? c.fat_percentage + '%' : '--'}</td>
              <td class="px-4 py-3 text-gray-400">\${parseFloat(c.rate_per_litre || currentPrice).toLocaleString()}</td>
              <td class="px-4 py-3 font-semibold text-blue-400">\${parseFloat(c.total_amount || 0).toLocaleString()} Tsh</td>
            </tr>
          \`;
        }).join('');
      } else {
        tbody.innerHTML = \`<tr><td colspan="8" class="px-4 py-6 text-center text-gray-500">No report records found matching filter criteria.</td></tr>\`;
      }

      document.getElementById('reportTotalVol').innerText = totalVol.toFixed(1) + ' L';
      document.getElementById('reportTotalPayout').innerText = totalPay.toLocaleString() + ' Tsh';
      document.getElementById('reportTotalCount').innerText = filtered.length + ' Records';
      document.getElementById('reportRowCountBadge').innerText = filtered.length + ' Rows';
    }

    function resetReportFilters() {
      document.getElementById('reportSearchInput').value = '';
      document.getElementById('reportIntervalSelect').value = 'all';
      document.getElementById('reportFarmerSelect').value = 'all';
      renderReportsTable();
    }

    function getFilteredReportData() {
      const searchTxt = document.getElementById('reportSearchInput').value.toLowerCase();
      const interval = document.getElementById('reportIntervalSelect').value;
      const farmerFilter = document.getElementById('reportFarmerSelect').value;
      const now = new Date();

      return cachedCollections.filter(c => {
        const farmerObj = c.farmers || cachedFarmers.find(f => f.farmer_id === c.farmer_id) || {};
        const nameMatch = (farmerObj.name || '').toLowerCase().includes(searchTxt) || c.farmer_id.toLowerCase().includes(searchTxt);
        const farmerMatch = (farmerFilter === 'all' || c.farmer_id === farmerFilter);
        let dateMatch = true;
        const cDate = new Date(c.created_at);
        if (interval === 'weekly') {
          const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
          dateMatch = cDate >= oneWeekAgo;
        } else if (interval === 'monthly') {
          dateMatch = cDate.getMonth() === now.getMonth() && cDate.getFullYear() === now.getFullYear();
        } else if (interval === 'yearly') {
          dateMatch = cDate.getFullYear() === now.getFullYear();
        }
        return nameMatch && farmerMatch && dateMatch;
      }).map(c => {
        const farmerObj = c.farmers || cachedFarmers.find(f => f.farmer_id === c.farmer_id) || {};
        return {
          "Date & Time": new Date(c.created_at).toLocaleString(),
          "Farmer ID": c.farmer_id,
          "Farmer Name": farmerObj.name || 'Unknown',
          "Zone": farmerObj.zone || '',
          "Volume (L)": parseFloat(c.liters || 0),
          "Fat %": c.fat_percentage || '',
          "Rate (Tsh)": parseFloat(c.rate_per_litre || currentPrice),
          "Total Payout (Tsh)": parseFloat(c.total_amount || 0)
        };
      });
    }

    function exportReportsExcel() {
      const data = getFilteredReportData();
      if(data.length === 0) { alert('No data to export.'); return; }
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Milk Collection Reports");
      XLSX.writeFile(workbook, "KondikiMilk_Reports.xlsx");
    }

    function exportReportsCSV() {
      const data = getFilteredReportData();
      if(data.length === 0) { alert('No data to export.'); return; }
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "KondikiMilk_Reports.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // ==================== FARMER SUBMIT & EDIT ====================
    async function handleFarmerSubmit(e) {
      e.preventDefault();
      const editingId = document.getElementById('editingFarmerId').value;
      const name = document.getElementById('farmerName').value.trim();
      const phone = document.getElementById('farmerPhone').value.trim();
      const zone = document.getElementById('farmerZone').value.trim();

      try {
        let url = '/api/farmers';
        let method = 'POST';
        let bodyData = { name, phone, zone };

        if(editingId) {
          url = \`/api/farmers/\${editingId}\`;
          method = 'PUT';
        }

        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData)
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);

        closeModal('farmerModal');
        loadManagementData();
        if(!editingId) {
          alert(\`Farmer registered successfully! Generated ID: \${data.farmer.farmer_id} | Passkey PIN: \${data.farmer.passkey}\`);
        }
      } catch(err) {
        alert('Error saving farmer: ' + err.message);
      }
    }

    function editFarmer(id) {
      const f = cachedFarmers.find(x => x.farmer_id === id);
      if(!f) return;
      document.getElementById('editingFarmerId').value = f.farmer_id;
      document.getElementById('farmerName').value = f.name;
      document.getElementById('farmerPhone').value = f.phone || '';
      document.getElementById('farmerZone').value = f.zone || '';
      document.getElementById('farmerModalTitle').innerText = 'Edit Farmer Details';
      openModal('farmerModal');
    }

    async function deleteFarmer(id) {
      if(!confirm('Are you sure you want to delete this farmer?')) return;
      try {
        const res = await fetch(\`/api/farmers/\${id}\`, { method: 'DELETE' });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);
        loadManagementData();
      } catch(err) {
        alert('Error deleting farmer: ' + err.message);
      }
    }

    // ==================== COLLECTION INTAKE ====================
    async function handleCollectionSubmit(e) {
      e.preventDefault();
      const farmer_id = document.getElementById('collectionFarmerId').value;
      const liters = parseFloat(document.getElementById('collectionLiters').value);
      const fat_percentage = document.getElementById('collectionFat').value ? parseFloat(document.getElementById('collectionFat').value) : null;

      try {
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmer_id, liters, fat_percentage, rate_per_litre: currentPrice })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);

        closeModal('collectionModal');
        document.getElementById('collectionForm').reset();
        loadManagementData();
        alert('Milk intake recorded successfully!');
      } catch(err) {
        alert('Error recording intake: ' + err.message);
      }
    }

    // ==================== MILK PRICE ====================
    async function saveMilkPrice() {
      const p = parseFloat(document.getElementById('milkPriceInput').value);
      if(isNaN(p) || p <= 0) { alert('Please enter a valid price'); return; }
      currentPrice = p;
      localStorage.setItem('milk_price_per_litre', currentPrice);
      document.getElementById('statPrice').innerHTML = \`\${currentPrice.toLocaleString()} <span class="text-xs text-gray-400">Tsh</span>\`;
      alert('Milk price updated successfully!');
    }

    // ==================== STAFF USER MANAGEMENT ====================
    function renderUsersTable() {
      const tbody = document.getElementById('usersTableBody');
      if(systemUsers.length > 0) {
        tbody.innerHTML = systemUsers.map((u, idx) => \`
          <tr>
            <td class="px-4 py-3 font-medium">\${u.username} \${u.username === 'admin' ? '(Main Admin)' : ''}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold \${u.role === 'Admin' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-blue-950 text-blue-300 border border-blue-800'}">\${u.role}</span></td>
            <td class="px-4 py-3 text-right space-x-2">
              <button onclick="editUser(\${idx})" class="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
              \${u.username !== 'admin' ? \`<button onclick="deleteUser(\${idx})" class="text-red-400 hover:text-red-300 text-xs">Delete</button>\` : ''}
            </td>
          </tr>
        \`).join('');
      } else {
        tbody.innerHTML = \`<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">No staff users configured.</td></tr>\`;
      }
    }

    function handleUserSubmit(e) {
      e.preventDefault();
      const idx = document.getElementById('editingUserIndex').value;
      const username = document.getElementById('userNameInput').value.trim();
      const password = document.getElementById('userPasswordInput').value.trim();
      const role = document.getElementById('userRoleInput').value;

      // Restrict sub-admin from modifying main admin account or adding full admin if sub-admin
      if (loggedInStaff && loggedInStaff.role === 'Sub-Admin') {
        if (idx !== "" && systemUsers[idx].username === 'admin') {
          alert('Access Denied: Sub-admin cannot modify the main admin account.');
          return;
        }
        if (username === 'admin' && (idx === "" || systemUsers[idx].username !== 'admin')) {
          alert('Access Denied: Sub-admin cannot recreate or override the main admin account.');
          return;
        }
      }

      if(idx !== "") {
        systemUsers[idx] = { username, password, role };
      } else {
        if(systemUsers.some(u => u.username === username)) {
          alert('Username already exists.');
          return;
        }
        systemUsers.push({ username, password, role });
      }

      localStorage.setItem('milk_app_users', JSON.stringify(systemUsers));
      closeModal('userModal');
      renderUsersTable();
      alert('Staff user saved successfully!');
    }

    function editUser(idx) {
      const u = systemUsers[idx];
      if(loggedInStaff && loggedInStaff.role === 'Sub-Admin' && u.username === 'admin') {
        alert('Access Denied: Sub-admin cannot edit the main admin account.');
        return;
      }
      document.getElementById('editingUserIndex').value = idx;
      document.getElementById('userNameInput').value = u.username;
      document.getElementById('userPasswordInput').value = u.password;
      document.getElementById('userRoleInput').value = u.role;
      document.getElementById('userModalTitle').innerText = 'Edit Staff User';
      openModal('userModal');
    }

    function deleteUser(idx) {
      const u = systemUsers[idx];
      if(u.username === 'admin') {
        alert('The main admin account cannot be deleted.');
        return;
      }
      if(loggedInStaff && loggedInStaff.role === 'Sub-Admin') {
        alert('Access Denied: Sub-admin accounts do not have permission to delete staff users.');
        return;
      }
      if(!confirm('Are you sure you want to delete this staff user?')) return;
      systemUsers.splice(idx, 1);
      localStorage.setItem('milk_app_users', JSON.stringify(systemUsers));
      renderUsersTable();
    }

    // ==================== SMS BROADCAST ====================
    async function handleAnnouncementSubmit(e) {
      e.preventDefault();
      const message = document.getElementById('announcementMessage').value.trim();
      try {
        const res = await fetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        const data = await res.json();
        if(!res.ok) throw new Error(data.error);

        document.getElementById('announcementMessage').value = '';
        loadAnnouncementsHistory();
        alert('Announcement broadcasted successfully to all farmers!');
      } catch(err) {
        alert('Error broadcasting: ' + err.message);
      }
    }

    async function loadAnnouncementsHistory() {
      try {
        const res = await fetch('/api/announcements');
        const data = await res.json();
        const listDiv = document.getElementById('announcementsHistoryList');
        if(data && data.length > 0) {
          listDiv.innerHTML = data.map(a => \`
            <div class="p-3 bg-gray-950 rounded-xl border border-gray-800 flex justify-between items-start">
              <div>
                <p class="text-xs text-gray-200">\${a.message}</p>
                <span class="text-[10px] text-gray-500">Sent on: \${new Date(a.created_at).toLocaleString()}</span>
              </div>
            </div>
          \`).join('');
        } else {
          listDiv.innerHTML = \`<p class="text-xs text-gray-500">No broadcast history found.</p>\`;
        }
      } catch(e) {}
    }

    // ==================== MODALS & UTILS ====================
    function openModal(modalId) {
      if(modalId === 'farmerModal') {
        document.getElementById('editingFarmerId').value = '';
        document.getElementById('farmerForm').reset();
        document.getElementById('farmerModalTitle').innerText = 'Register New Farmer';
      } else if(modalId === 'userModal') {
        document.getElementById('editingUserIndex').value = '';
        document.getElementById('userForm').reset();
        document.getElementById('userModalTitle').innerText = 'Create Staff User';
      }
      document.getElementById(modalId).classList.remove('hidden');
      document.getElementById(modalId).classList.add('flex');
    }

    function closeModal(modalId) {
      document.getElementById(modalId).classList.add('hidden');
      document.getElementById(modalId).classList.remove('flex');
    }

    function showError(msg) {
      const banner = document.getElementById('errorBanner');
      document.getElementById('errorMessage').innerText = msg;
      banner.classList.remove('hidden');
    }
  </script>
</body>
</html>
  `);
});

// ==================== BACKEND API ROUTES ====================

// 1. Farmer Portal Login
app.post('/api/farmers/login', async (req, res) => {
  try {
    const { farmer_id, passkey } = req.body;
    const { data: farmer, error } = await supabase
      .from('farmers')
      .select('*')
      .eq('farmer_id', farmer_id)
      .single();

    if (error || !farmer) return res.status(404).json({ error: 'Farmer ID not found.' });
    if (farmer.passkey !== passkey) return res.status(401).json({ error: 'Incorrect Passkey PIN.' });

    const { data: collections } = await supabase
      .from('collections')
      .select('*')
      .eq('farmer_id', farmer_id)
      .order('created_at', { ascending: false });

    res.json({ farmer, collections: collections || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Management Data Fetch
app.get('/api/management/data', async (req, res) => {
  try {
    const { data: farmers, error: fErr } = await supabase.from('farmers').select('*').order('created_at', { ascending: false });
    if (fErr) throw fErr;

    const { data: collections, error: cErr } = await supabase
      .from('collections')
      .select('*, farmers(name, zone, phone)')
      .order('created_at', { ascending: false });
    if (cErr) throw cErr;

    res.json({ farmers, collections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Register / Create Farmer with auto-sequenced ID (Fixing unique constraint error)
app.post('/api/farmers', async (req, res) => {
  try {
    const { name, phone, zone } = req.body;
    
    // Find highest existing ID to generate next incremental ID securely
    const { data: existingFarmers } = await supabase
      .from('farmers')
      .select('farmer_id')
      .order('farmer_id', { ascending: false })
      .limit(1);

    let nextNum = 1;
    if (existingFarmers && existingFarmers.length > 0) {
      const lastId = existingFarmers[0].farmer_id;
      const numPart = parseInt(lastId.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numPart)) nextNum = numPart + 1;
    }

    const farmer_id = 'KMK' + String(nextNum).padStart(5, '0');
    const passkey = String(Math.floor(1000 + Math.random() * 9000));

    const { data, error } = await supabase
      .from('farmers')
      .insert([{ farmer_id, name, phone, zone, passkey }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, farmer: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Farmer
app.put('/api/farmers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, zone } = req.body;
    const { data, error } = await supabase
      .from('farmers')
      .update({ name, phone, zone })
      .eq('farmer_id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, farmer: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete Farmer
app.delete('/api/farmers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('farmers').delete().eq('farmer_id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Log Collection Intake
app.post('/api/collections', async (req, res) => {
  try {
    const { farmer_id, liters, fat_percentage, rate_per_litre } = req.body;
    const total_amount = liters * rate_per_litre;

    const { data, error } = await supabase
      .from('collections')
      .insert([{ farmer_id, liters, fat_percentage, rate_per_litre, total_amount }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, collection: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Announcements Endpoints
app.get('/api/announcements', async (req, res) => {
  try {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const { message } = req.body;
    const { data, error } = await supabase.from('announcements').insert([{ message }]).select().single();
    if (error) throw error;
    res.json({ success: true, announcement: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Milk Collection Hub running on port ${PORT}`);
});
