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

app.get('/api/farmers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('farmers').select('*').order('id', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/farmers', async (req, res) => {
  try {
    const { name, phone, zone } = req.body;
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const farmer_id = `kmk00${randomNum.toString().slice(-3)}`;
    
    const { data, error } = await supabase
      .from('farmers')
      .insert([{ farmer_id, name, phone, zone, passkey: '1234' }])
      .select();

    if (error) throw error;
    res.json({ success: true, farmer: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/collections', async (req, res) => {
  try {
    const { data, error } = await supabase.from('collections').select('*, farmers(name, zone)').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
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
    <div class="flex items-center space-x-3">
      <div class="bg-blue-600 p-2.5 rounded-xl text-white shadow-md">
        <i class="fa-solid fa-bucket text-lg"></i>
      </div>
      <div>
        <h1 class="text-base sm:text-lg font-bold tracking-wide">Milk Collection Hub</h1>
        <p class="text-[11px] text-gray-400">Management & Farmer Portal</p>
      </div>
    </div>
    <div class="flex items-center space-x-2">
      <!-- Theme Toggle Button -->
      <button type="button" onclick="toggleTheme()" class="bg-gray-800 hover:bg-gray-700 text-yellow-400 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-gray-700 cursor-pointer flex items-center gap-1.5">
        <i id="themeIcon" class="fa-solid fa-sun"></i> <span id="themeText" class="hidden sm:inline">Theme</span>
      </button>
      
      <!-- Farmer Portal Navigation Button -->
      <button type="button" onclick="switchView('publicHome')" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition border border-gray-700 cursor-pointer flex items-center gap-1.5">
        <i class="fa-solid fa-user text-emerald-400"></i> Farmer Portal
      </button>

      <!-- Staff Login Navigation Button -->
      <button type="button" onclick="switchView('staffLogin')" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow cursor-pointer flex items-center gap-1.5">
        <i class="fa-solid fa-lock"></i> Staff / Admin Login
      </button>

      <!-- Logout Button (Hidden by default until logged into management) -->
      <button type="button" id="headerLogoutBtn" onclick="handleLogout()" class="hidden bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow cursor-pointer flex items-center gap-1.5">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

    <!-- VIEW 1: FARMER PORTAL -->
    <section id="view-publicHome" class="space-y-6">
      <div class="max-w-md mx-auto border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5 bg-gray-900">
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
      <div class="max-w-md mx-auto border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-5 bg-gray-900">
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
      <div class="flex justify-between items-center border border-gray-800 p-4 rounded-2xl bg-gray-900">
        <div>
          <span class="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-[10px] font-bold">Role: Admin</span>
          <h2 class="text-sm font-bold mt-0.5">Management Portal</h2>
        </div>
        <div class="flex gap-2">
          <button type="button" onclick="openModal('farmerModal')" class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded-lg font-semibold cursor-pointer"><i class="fa-solid fa-user-plus"></i> New Farmer</button>
        </div>
      </div>

      <!-- Farmers Directory Grid -->
      <div class="border border-gray-800 rounded-2xl p-5 bg-gray-900 space-y-4 shadow">
        <h3 class="text-sm font-bold">Registered Farmers Directory</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-800 text-gray-400 uppercase">
              <tr>
                <th class="p-3">ID</th>
                <th class="p-3">Name</th>
                <th class="p-3">Phone</th>
                <th class="p-3">Zone</th>
              </tr>
            </thead>
            <tbody id="farmersTableBody" class="divide-y divide-gray-800">
              <tr><td colspan="4" class="p-4 text-center text-gray-500">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

  </main>

  <!-- MODAL: ADD FARMER -->
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

  <script>
    // Robust View Switcher Function for Desktop & Android Applications
    function switchView(viewId) {
      const views = ['view-publicHome', 'view-staffLogin', 'view-managementPortal'];
      views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('hidden');
        }
      });
      const target = document.getElementById('view-' + viewId);
      if (target) {
        target.classList.remove('hidden');
      }
    }

    function openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
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

    function handleStaffLogin(e) {
      e.preventDefault();
      switchView('managementPortal');
      document.getElementById('headerLogoutBtn').classList.remove('hidden');
      loadFarmersDirectory();
    }

    function handleLogout() {
      document.getElementById('headerLogoutBtn').classList.add('hidden');
      switchView('publicHome');
    }

    async function loadFarmersDirectory() {
      try {
        const res = await fetch('/api/farmers');
        const farmers = await res.json();
        const tbody = document.getElementById('farmersTableBody');
        if (!farmers || !farmers.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">No farmers registered yet.</td></tr>';
          return;
        }
        tbody.innerHTML = farmers.map(f => \`
          <tr class="hover:bg-gray-800/50">
            <td class="p-3 font-mono text-emerald-400">\${f.farmer_id}</td>
            <td class="p-3 font-semibold">\${f.name}</td>
            <td class="p-3 text-gray-300">\${f.phone || '-'}</td>
            <td class="p-3 text-gray-300">\${f.zone || '-'}</td>
          </tr>
        \`).join('');
      } catch (err) {
        console.error('Error loading farmers:', err);
      }
    }

    async function handleFarmerSubmit(e) {
      e.preventDefault();
      const payload = {
        name: document.getElementById('farmerName').value,
        phone: document.getElementById('farmerPhone').value,
        zone: document.getElementById('farmerZone').value
      };

      try {
        const res = await fetch('/api/farmers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
          alert('Farmer registered successfully!');
          closeModal('farmerModal');
          document.getElementById('farmerName').value = '';
          document.getElementById('farmerPhone').value = '';
          document.getElementById('farmerZone').value = '';
          loadFarmersDirectory();
        } else {
          alert('Error: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error saving farmer: ' + err.message);
      }
    }
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
