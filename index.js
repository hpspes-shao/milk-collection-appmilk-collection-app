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
          <select id="collectionFarmerId" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            <option value="">-- Choose Registered Farmer --</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Milk Volume (Liters)</label>
          <input type="number" step="0.1" id="collectionLiters" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 25.5">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Fat Content Percentage (%)</label>
          <input type="number" step="0.01" id="collectionFat" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. 3.8">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal('collectionModal')" class="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium cursor-pointer">Cancel</button>
          <button type="submit" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer">Submit Intake</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    // Frontend script integration placeholder matching Supabase 'farmer_id' column
    console.log("Milk Collection Hub Frontend Initialized");
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
