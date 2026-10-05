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
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== API ROUTES ====================

app.get('/api/farmers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('farmers')
      .select('*')
      .order('farmer_id', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/farmers', async (req, res) => {
  try {
    const { name, phone, zone } = req.body;

    const { data: existing } = await supabase
      .from('farmers')
      .select('farmer_id')
      .like('farmer_id', 'kmk%')
      .order('farmer_id', { ascending: false })
      .limit(50);

    let nextNumber = 1;
    if (existing && existing.length > 0) {
      let maxNum = 0;
      existing.forEach(r => {
        const m = (r.farmer_id || '').match(/kmk(\\d+)/i);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      });
      nextNumber = maxNum + 1;
    }

    const farmer_id = 'kmk' + String(nextNumber).padStart(5, '0');
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

app.put('/api/farmers/:id', async (req, res) => {
  try {
    const { name, phone, zone, passkey } = req.body;
    const { data, error } = await supabase
      .from('farmers')
      .update({ name, phone, zone, passkey })
      .eq('id', req.params.id)
      .select();
    if (error) throw error;
    res.json({ success: true, farmer: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/farmers/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('farmers')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/intakes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('milk_collections')
      .select('*')
      .order('collected_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/intakes', async (req, res) => {
  try {
    const { farmer_id, quantity_liters, fat_percentage, snf_percentage, price_per_liter, rejected } = req.body;
    const total_amount = rejected ? 0 : (parseFloat(quantity_liters) * parseFloat(price_per_liter));

    const { data, error } = await supabase
      .from('milk_collections')
      .insert([{
        farmer_id,
        quantity_liters,
        fat_percentage: fat_percentage || 0,
        snf_percentage: snf_percentage || 0,
        price_per_liter,
        total_amount,
        rejected: rejected || false,
        collected_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, intake: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FRONTEND ====================
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milk Collection Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased">

<header class="bg-gray-900 border-b border-gray-800 sticky top-0 z-40 px-4 py-3">
  <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-3 cursor-pointer" onclick="goHome()">
      <div class="bg-blue-600 p-2.5 rounded-xl">
        <i class="fa-solid fa-bucket text-white text-lg"></i>
      </div>
      <div>
        <h1 class="font-bold text-base sm:text-lg">Milk Collection Hub</h1>
        <p class="text-[11px] text-gray-400">Management & Admin Portal</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <button onclick="openModal('farmerModal')" class="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded-lg font-semibold">
        <i class="fa-solid fa-user-plus"></i> New Farmer
      </button>
      <button onclick="openModal('intakeModal')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 rounded-lg font-semibold">
        <i class="fa-solid fa-plus"></i> Log Intake
      </button>
    </div>
  </div>
</header>

<div class="bg-gray-900 border-b border-gray-800">
  <div class="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto text-xs font-semibold">
    <button id="tab-dashboard" onclick="switchTab('dashboard')" class="px-4 py-3 border-b-2 border-blue-500 text-blue-400 whitespace-nowrap">
      <i class="fa-solid fa-chart-pie"></i> Dashboard
    </button>
    <button id="tab-farmers" onclick="switchTab('farmers')" class="px-4 py-3 border-b-2 border-transparent text-gray-400 hover:text-white whitespace-nowrap">
      <i class="fa-solid fa-users"></i> Farmers
    </button>
    <button id="tab-intakes" onclick="switchTab('intakes')" class="px-4 py-3 border-b-2 border-transparent text-gray-400 hover:text-white whitespace-nowrap">
      <i class="fa-solid fa-clipboard-list"></i> Intakes
    </button>
    <button id="tab-admin" onclick="switchTab('admin')" class="px-4 py-3 border-b-2 border-transparent text-gray-400 hover:text-white whitespace-nowrap">
      <i class="fa-solid fa-shield-halved"></i> Admin & Settings
    </button>
  </div>
</div>

<main class="max-w-6xl mx-auto p-4 space-y-6">

  <!-- DASHBOARD -->
  <section id="view-dashboard" class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex justify-between items-center">
        <div>
          <p class="text-[11px] text-gray-400 uppercase">Registered Farmers</p>
          <p id="statFarmers" class="text-2xl font-bold mt-1">—</p>
        </div>
        <div class="bg-blue-600/20 text-blue-400 p-3 rounded-xl"><i class="fa-solid fa-users text-xl"></i></div>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex justify-between items-center">
        <div>
          <p class="text-[11px] text-gray-400 uppercase">Total Milk Intake</p>
          <p id="statLitres" class="text-2xl font-bold mt-1">— L</p>
        </div>
        <div class="bg-emerald-600/20 text-emerald-400 p-3 rounded-xl"><i class="fa-solid fa-bucket text-xl"></i></div>
      </div>
      <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex justify-between items-center">
        <div>
          <p class="text-[11px] text-gray-400 uppercase">Current Price / Litre</p>
          <p id="statPrice" class="text-2xl font-bold mt-1">— Tsh</p>
        </div>
        <div class="bg-purple-600/20 text-purple-400 p-3 rounded-xl"><i class="fa-solid fa-coins text-xl"></i></div>
      </div>
    </div>

    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold"><i class="fa-solid fa-clock-rotate-left text-blue-400"></i> Recent Intakes</h3>
        <button onclick="loadDashboard()" class="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg">
          <i class="fa-solid fa-rotate"></i> Refresh
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="text-gray-400 uppercase bg-gray-800/50">
            <tr>
              <th class="p-3">Farmer</th>
              <th class="p-3">Zone</th>
              <th class="p-3">Volume (L)</th>
              <th class="p-3">Fat %</th>
              <th class="p-3">Total (Tsh)</th>
              <th class="p-3">Time</th>
            </tr>
          </thead>
          <tbody id="recentIntakesBody">
            <tr><td colspan="6" class="p-6 text-center text-gray-500">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- FARMERS -->
  <section id="view-farmers" class="hidden space-y-4">
    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div class="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <h3 class="font-bold">Farmers Directory</h3>
        <input id="farmerSearch" oninput="filterFarmers()" placeholder="Search ID / name / zone..." 
               class="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs w-full sm:w-64">
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="text-gray-400 uppercase bg-gray-800/50">
            <tr>
              <th class="p-3">ID</th>
              <th class="p-3">Name</th>
              <th class="p-3">Phone</th>
              <th class="p-3">Zone</th>
              <th class="p-3">Passkey</th>
              <th class="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody id="farmersBody"></tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- INTAKES -->
  <section id="view-intakes" class="hidden space-y-4">
    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div class="flex flex-col sm:flex-row justify-between gap-3 mb-4">
        <h3 class="font-bold">All Milk Intakes</h3>
        <div class="flex gap-2">
          <input id="intakeSearch" oninput="filterIntakes()" placeholder="Search Farmer ID..." 
                 class="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs w-40">
          <button onclick="exportIntakes('csv')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 rounded-lg">CSV</button>
          <button onclick="exportIntakes('excel')" class="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-2 rounded-lg">Excel</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="text-gray-400 uppercase bg-gray-800/50">
            <tr>
              <th class="p-3">Date</th>
              <th class="p-3">Farmer ID</th>
              <th class="p-3">Volume (L)</th>
              <th class="p-3">Fat %</th>
              <th class="p-3">SNF %</th>
              <th class="p-3">Price</th>
              <th class="p-3">Total</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody id="intakesBody"></tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- ADMIN -->
  <section id="view-admin" class="hidden space-y-4">
    <div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 max-w-md">
      <h3 class="font-bold mb-4">Settings</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Current Price per Litre (Tsh)</label>
          <input type="number" id="settingPrice" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm" value="800">
        </div>
        <button onclick="savePrice()" class="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2.5 rounded-lg font-semibold">
          Save Price
        </button>
      </div>
    </div>
  </section>
</main>

<!-- MODALS -->
<div id="farmerModal" class="fixed inset-0 bg-black/70 hidden items-center justify-center p-4 z-50">
  <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="font-bold">Register New Farmer</h3>
      <button onclick="closeModal('farmerModal')" class="text-gray-400 text-xl">&times;</button>
    </div>
    <form onsubmit="submitFarmer(event)" class="space-y-3">
      <div>
        <label class="text-xs text-gray-400">Full Name</label>
        <input id="fName" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
      </div>
      <div>
        <label class="text-xs text-gray-400">Phone</label>
        <input id="fPhone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
      </div>
      <div>
        <label class="text-xs text-gray-400">Zone</label>
        <input id="fZone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal('farmerModal')" class="px-4 py-2 bg-gray-800 rounded-lg text-xs">Cancel</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 rounded-lg text-xs font-semibold">Save</button>
      </div>
    </form>
  </div>
</div>

<div id="editFarmerModal" class="fixed inset-0 bg-black/70 hidden items-center justify-center p-4 z-50">
  <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="font-bold">Edit Farmer</h3>
      <button onclick="closeModal('editFarmerModal')" class="text-gray-400 text-xl">&times;</button>
    </div>
    <form onsubmit="submitEditFarmer(event)" class="space-y-3">
      <input type="hidden" id="editId">
      <div>
        <label class="text-xs text-gray-400">Farmer ID</label>
        <input id="editCode" readonly class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1 text-gray-400">
      </div>
      <div>
        <label class="text-xs text-gray-400">Full Name</label>
        <input id="editName" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
      </div>
      <div>
        <label class="text-xs text-gray-400">Phone</label>
        <input id="editPhone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
      </div>
      <div>
        <label class="text-xs text-gray-400">Zone</label>
        <input id="editZone" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
      </div>
      <div>
        <label class="text-xs text-gray-400">Passkey</label>
        <input id="editPasskey" maxlength="4" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal('editFarmerModal')" class="px-4 py-2 bg-gray-800 rounded-lg text-xs">Cancel</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 rounded-lg text-xs font-semibold">Update</button>
      </div>
    </form>
  </div>
</div>

<div id="intakeModal" class="fixed inset-0 bg-black/70 hidden items-center justify-center p-4 z-50">
  <div class="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
    <div class="flex justify-between items-center">
      <h3 class="font-bold">Log Milk Intake</h3>
      <button onclick="closeModal('intakeModal')" class="text-gray-400 text-xl">&times;</button>
    </div>
    <form onsubmit="submitIntake(event)" class="space-y-3">
      <div>
        <label class="text-xs text-gray-400">Farmer</label>
        <select id="intakeFarmer" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1"></select>
      </div>
      <div>
        <label class="text-xs text-gray-400">Volume (Litres)</label>
        <input type="number" step="0.1" id="intakeLitres" required class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs text-gray-400">Fat %</label>
          <input type="number" step="0.1" id="intakeFat" value="3.5" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
        </div>
        <div>
          <label class="text-xs text-gray-400">SNF %</label>
          <input type="number" step="0.1" id="intakeSnf" value="8.5" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
        </div>
      </div>
      <div>
        <label class="text-xs text-gray-400">Price per Litre (Tsh)</label>
        <input type="number" id="intakePrice" class="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm mt-1">
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="intakeRejected">
        <label for="intakeRejected" class="text-xs">Mark as Rejected</label>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" onclick="closeModal('intakeModal')" class="px-4 py-2 bg-gray-800 rounded-lg text-xs">Cancel</button>
        <button type="submit" class="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-semibold">Save Intake</button>
      </div>
    </form>
  </div>
</div>

<script>
  let allFarmers = [];
  let allIntakes = [];
  let currentPrice = localStorage.getItem('milkPrice') || 800;

  function switchTab(tab) {
    ['dashboard','farmers','intakes','admin'].forEach(t => {
      document.getElementById('view-' + t).classList.add('hidden');
      document.getElementById('tab-' + t).className = 'px-4 py-3 border-b-2 border-transparent text-gray-400 hover:text-white whitespace-nowrap';
    });
    document.getElementById('view-' + tab).classList.remove('hidden');
    document.getElementById('tab-' + tab).className = 'px-4 py-3 border-b-2 border-blue-500 text-blue-400 whitespace-nowrap';

    if (tab === 'dashboard') loadDashboard();
    if (tab === 'farmers') loadFarmers();
    if (tab === 'intakes') loadIntakes();
    if (tab === 'admin') document.getElementById('settingPrice').value = currentPrice;
  }

  function goHome() { switchTab('dashboard'); }

  function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('flex');
    if (id === 'intakeModal') {
      document.getElementById('intakePrice').value = currentPrice;
      populateFarmerSelect();
    }
  }

  function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
  }

  async function loadDashboard() {
    await Promise.all([loadFarmers(true), loadIntakes(true)]);
    document.getElementById('statFarmers').textContent = allFarmers.length;
    const totalL = allIntakes.reduce((s, i) => s + (parseFloat(i.quantity_liters) || 0), 0);
    document.getElementById('statLitres').textContent = totalL.toFixed(1) + ' L';
    document.getElementById('statPrice').textContent = currentPrice + ' Tsh';

    const recent = allIntakes.slice(0, 10);
    const tbody = document.getElementById('recentIntakesBody');
    if (!recent.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-500">No intakes yet</td></tr>';
      return;
    }
    tbody.innerHTML = recent.map(i => {
      const farmer = allFarmers.find(f => f.farmer_id === i.farmer_id);
      const time = i.collected_at ? new Date(i.collected_at).toLocaleString('en-GB') : '-';
      return '<tr class="hover:bg-gray-800/40">' +
        '<td class="p-3 font-mono text-emerald-400">' + (i.farmer_id || '-') + '</td>' +
        '<td class="p-3">' + (farmer ? farmer.zone : '-') + '</td>' +
        '<td class="p-3 font-semibold">' + (i.quantity_liters || '-') + '</td>' +
        '<td class="p-3">' + (i.fat_percentage || '-') + '</td>' +
        '<td class="p-3">' + (i.total_amount ? Number(i.total_amount).toLocaleString() : '-') + '</td>' +
        '<td class="p-3 text-gray-400">' + time + '</td></tr>';
    }).join('');
  }

  async function loadFarmers(silent) {
    try {
      const res = await fetch('/api/farmers');
      allFarmers = await res.json();
      if (!silent) renderFarmers(allFarmers);
    } catch (e) { console.error(e); }
  }

  function renderFarmers(list) {
    const tbody = document.getElementById('farmersBody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-gray-500">No farmers</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(f => 
      '<tr class="hover:bg-gray-800/40">' +
      '<td class="p-3 font-mono text-emerald-400">' + f.farmer_id + '</td>' +
      '<td class="p-3 font-semibold">' + f.name + '</td>' +
      '<td class="p-3">' + (f.phone || '-') + '</td>' +
      '<td class="p-3">' + (f.zone || '-') + '</td>' +
      '<td class="p-3 font-mono text-yellow-400">' + f.passkey + '</td>' +
      '<td class="p-3 text-center space-x-1">' +
      '<button onclick="openEdit(\\'' + f.id + '\\')" class="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[10px]"><i class="fa-solid fa-pen"></i></button> ' +
      '<button onclick="deleteFarmer(\\'' + f.id + '\\',\\'' + f.name + '\\')" class="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-[10px]"><i class="fa-solid fa-trash"></i></button>' +
      '</td></tr>'
    ).join('');
  }

  function filterFarmers() {
    const q = document.getElementById('farmerSearch').value.toLowerCase();
    renderFarmers(allFarmers.filter(f =>
      (f.farmer_id || '').toLowerCase().includes(q) ||
      (f.name || '').toLowerCase().includes(q) ||
      (f.zone || '').toLowerCase().includes(q)
    ));
  }

  async function submitFarmer(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('fName').value.trim(),
      phone: document.getElementById('fPhone').value.trim(),
      zone: document.getElementById('fZone').value.trim()
    };
    const res = await fetch('/api/farmers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      alert('Farmer created!\\n\\nID: ' + result.farmer.farmer_id + '\\nPasskey: ' + result.farmer.passkey);
      closeModal('farmerModal');
      e.target.reset();
      loadDashboard();
    } else {
      alert(result.error || 'Error');
    }
  }

  function openEdit(id) {
    const f = allFarmers.find(x => x.id == id);
    if (!f) return;
    document.getElementById('editId').value = f.id;
    document.getElementById('editCode').value = f.farmer_id;
    document.getElementById('editName').value = f.name || '';
    document.getElementById('editPhone').value = f.phone || '';
    document.getElementById('editZone').value = f.zone || '';
    document.getElementById('editPasskey').value = f.passkey || '';
    openModal('editFarmerModal');
  }

  async function submitEditFarmer(e) {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const payload = {
      name: document.getElementById('editName').value.trim(),
      phone: document.getElementById('editPhone').value.trim(),
      zone: document.getElementById('editZone').value.trim(),
      passkey: document.getElementById('editPasskey').value.trim()
    };
    const res = await fetch('/api/farmers/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      alert('Updated successfully');
      closeModal('editFarmerModal');
      loadFarmers();
      loadDashboard();
    } else {
      alert(result.error || 'Error');
    }
  }

  async function deleteFarmer(id, name) {
    if (!confirm('Delete farmer "' + name + '"?')) return;
    const res = await fetch('/api/farmers/' + id, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      loadFarmers();
      loadDashboard();
    } else {
      alert(result.error || 'Error');
    }
  }

  async function loadIntakes(silent) {
    try {
      const res = await fetch('/api/intakes');
      allIntakes = await res.json();
      if (!silent) renderIntakes(allIntakes);
    } catch (e) { console.error(e); }
  }

  function renderIntakes(list) {
    const tbody = document.getElementById('intakesBody');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-gray-500">No intakes recorded</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(i => {
      const date = i.collected_at ? new Date(i.collected_at).toLocaleDateString('en-GB') : '-';
      return '<tr class="hover:bg-gray-800/40">' +
        '<td class="p-3">' + date + '</td>' +
        '<td class="p-3 font-mono text-emerald-400">' + i.farmer_id + '</td>' +
        '<td class="p-3 font-semibold">' + i.quantity_liters + '</td>' +
        '<td class="p-3">' + (i.fat_percentage || '-') + '</td>' +
        '<td class="p-3">' + (i.snf_percentage || '-') + '</td>' +
        '<td class="p-3">' + (i.price_per_liter || '-') + '</td>' +
        '<td class="p-3">' + (i.total_amount ? Number(i.total_amount).toLocaleString() : '-') + '</td>' +
        '<td class="p-3">' + (i.rejected ? '<span class="text-red-400">Rejected</span>' : '<span class="text-emerald-400">OK</span>') + '</td></tr>';
    }).join('');
  }

  function filterIntakes() {
    const q = document.getElementById('intakeSearch').value.toLowerCase();
    renderIntakes(allIntakes.filter(i => (i.farmer_id || '').toLowerCase().includes(q)));
  }

  function populateFarmerSelect() {
    const sel = document.getElementById('intakeFarmer');
    sel.innerHTML = '<option value="">Select farmer...</option>' +
      allFarmers.map(f => '<option value="' + f.farmer_id + '">' + f.farmer_id + ' — ' + f.name + '</option>').join('');
  }

  async function submitIntake(e) {
    e.preventDefault();
    const payload = {
      farmer_id: document.getElementById('intakeFarmer').value,
      quantity_liters: document.getElementById('intakeLitres').value,
      fat_percentage: document.getElementById('intakeFat').value,
      snf_percentage: document.getElementById('intakeSnf').value,
      price_per_liter: document.getElementById('intakePrice').value,
      rejected: document.getElementById('intakeRejected').checked
    };
    const res = await fetch('/api/intakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      alert('Intake logged successfully!');
      closeModal('intakeModal');
      e.target.reset();
      loadDashboard();
    } else {
      alert(result.error || 'Error');
    }
  }

  function exportIntakes(format) {
    const q = document.getElementById('intakeSearch').value.toLowerCase();
    let data = allIntakes;
    if (q) data = data.filter(i => (i.farmer_id || '').toLowerCase().includes(q));
    if (!data.length) return alert('No data to export');

    const rows = data.map(i => ({
      Date: i.collected_at ? new Date(i.collected_at).toLocaleDateString('en-GB') : '',
      'Farmer ID': i.farmer_id,
      'Volume (L)': i.quantity_liters,
      'Fat %': i.fat_percentage,
      'SNF %': i.snf_percentage,
      'Price/L': i.price_per_liter,
      Total: i.total_amount,
      Status: i.rejected ? 'Rejected' : 'OK'
    }));

    if (format === 'csv') {
      const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'milk_intakes.csv';
      a.click();
    } else {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Intakes');
      XLSX.writeFile(wb, 'milk_intakes.xlsx');
    }
  }

  function savePrice() {
    currentPrice = document.getElementById('settingPrice').value;
    localStorage.setItem('milkPrice', currentPrice);
    document.getElementById('statPrice').textContent = currentPrice + ' Tsh';
    alert('Price saved!');
  }

  // Start
  loadDashboard();
</script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
