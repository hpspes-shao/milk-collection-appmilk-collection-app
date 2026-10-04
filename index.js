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

// ==================== PUBLIC DASHBOARD UI ====================
app.get('/', async (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milk Collection Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen flex flex-col font-sans">

  <!-- Navigation Bar -->
  <nav class="bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center shadow-lg">
    <div class="flex items-center space-x-3">
      <div class="bg-blue-600 p-2 rounded-lg text-white">
        <i class="fa-solid me-1 fa-bucket text-xl"></i>
      </div>
      <div>
        <h1 class="text-xl font-bold text-white tracking-wide">Milk Collection Hub</h1>
        <p class="text-xs text-gray-400">Public Monitoring & Entry Dashboard</p>
      </div>
    </div>
    <div class="flex space-x-2">
      <button onclick="openModal('farmerModal')" class="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2">
        <i class="fa-solid fa-user-plus text-blue-400"></i> New Farmer
      </button>
      <button onclick="openModal('collectionModal')" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-md">
        <i class="fa-solid fa-plus"></i> Log Intake
      </button>
    </div>
  </nav>

  <!-- Main Content Area -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

    <!-- Summary Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-gray-800 border border-gray-700 p-6 rounded-xl flex items-center justify-between shadow-md">
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered Farmers</p>
          <h2 id="totalFarmers" class="text-3xl font-extrabold text-white mt-1">--</h2>
        </div>
        <div class="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
          <i class="fa-solid fa-users text-2xl"></i>
        </div>
      </div>

      <div class="bg-gray-800 border border-gray-700 p-6 rounded-xl flex items-center justify-between shadow-md">
        <div>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Milk Intake</p>
          <h2 id="totalLiters" class="text-3xl font-extrabold text-emerald-400 mt-1">-- <span class="text-lg font-normal text-gray-400">L</span></h2>
        </div>
        <div class="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
          <i class="fa-solid fa-glass-water text-2xl"></i>
      </div>
    </div>

    <!-- Data Tables Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Recent Collections Table -->
      <div class="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-md flex flex-col">
        <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-list-check text-blue-400"></i> Recent Intakes
          </h3>
          <button onclick="loadDashboardData()" class="text-xs text-gray-400 hover:text-white transition flex items-center gap-1">
            <i class="fa-solid fa-rotate"></i> Refresh
          </button>
        </div>
        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left text-sm text-gray-300">
            <thead class="bg-gray-900/50 text-xs uppercase text-gray-400 border-b border-gray-700">
              <tr>
                <th class="px-6 py-3">Farmer</th>
                <th class="px-6 py-3">Zone</th>
                <th class="px-6 py-3">Volume (L)</th>
                <th class="px-6 py-3">Fat %</th>
                <th class="px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody id="collectionsTable" class="divide-y divide-gray-700">
              <tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Loading collection logs...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Farmers Directory Summary -->
      <div class="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-md flex flex-col">
        <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-address-book text-emerald-400"></i> Registered Farmers
          </h3>
        </div>
        <div class="overflow-y-auto max-h-[400px] flex-1">
          <ul id="farmersList" class="divide-y divide-gray-700">
            <li class="px-6 py-4 text-center text-gray-500">Loading farmers directory...</li>
          </ul>
        </div>
      </div>

    </div>
  </main>

  <!-- Add Farmer Modal -->
  <div id="farmerModal" class="fixed inset-0 bg-black/70 hidden items-center justify-center p-4 z-50">
    <div class="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-700 pb-3">
        <h3 class="text-lg font-bold text-white">Register New Farmer</h3>
        <button onclick="closeModal('farmerModal')" class="text-gray-400 hover:text-white">&times;</button>
      </div>
      <form id="farmerForm" onsubmit="handleFarmerSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Full Name</label>
          <input type="text" id="farmerName" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Phone Number</label>
          <input type="text" id="farmerPhone" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="+255...">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Collection Zone</label>
          <input type="text" id="farmerZone" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. Zone A">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal('farmerModal')" class="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-500">Save Farmer</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Log Intake Modal -->
  <div id="collectionModal" class="fixed inset-0 bg-black/70 hidden items-center justify-center p-4 z-50">
    <div class="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
      <div class="flex justify-between items-center border-b border-gray-700 pb-3">
        <h3 class="text-lg font-bold text-white">Log Milk Intake</h3>
        <button onclick="closeModal('collectionModal')" class="text-gray-400 hover:text-white">&times;</button>
      </div>
      <form id="collectionForm" onsubmit="handleCollectionSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Select Farmer</label>
          <select id="collectionFarmerId" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
            <option value="">Select a farmer...</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Volume (Liters)</label>
          <input type="number" step="0.1" id="collectionLiters" required class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="0.0">
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Fat Content (%) <span class="text-gray-500">(Optional)</span></label>
          <input type="number" step="0.01" id="collectionFat" class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" placeholder="e.g. 3.8">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="closeModal('collectionModal')" class="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500">Record Intake</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    function openModal(id) {
      document.getElementById(id).classList.remove('hidden');
      document.getElementById(id).classList.add('flex');
    }
    function closeModal(id) {
      document.getElementById(id).classList.add('hidden');
      document.getElementById(id).classList.remove('flex');
    }

    async function loadDashboardData() {
      try {
        const [farmersRes, collectionsRes] = await Promise.all([
          fetch('/api/farmers'),
          fetch('/api/collections')
        ]);

        const farmersData = await farmersRes.json();
        const collectionsData = await collectionsRes.json();

        const farmers = farmersData.data || [];
        const collections = collectionsData.data || [];

        // Update Summary Cards
        document.getElementById('totalFarmers').innerText = farmers.length;
        document.getElementById('totalEntries').innerText = collections.length;
        
        const sumLiters = collections.reduce((acc, c) => acc + Number(c.liters || 0), 0);
        document.getElementById('totalLiters').innerHTML = \`\${sumLiters.toFixed(1)} <span class="text-lg font-normal text-gray-400">L</span>\`;

        // Render Farmers Select Options
        const selectEl = document.getElementById('collectionFarmerId');
        selectEl.innerHTML = '<option value="">Select a farmer...</option>';
        farmers.forEach(f => {
          selectEl.innerHTML += \`<option value="\${f.id}">\${f.name} (\${f.zone || 'No Zone'})\`</option>;
        });

        // Render Farmers Directory
        const farmersList = document.getElementById('farmersList');
        if (farmers.length === 0) {
          farmersList.innerHTML = '<li class="px-6 py-4 text-center text-gray-500">No registered farmers yet.</li>';
        } else {
          farmersList.innerHTML = farmers.map(f => \`
            <li class="px-6 py-3 flex items-center justify-between">
              <div>
                <p class="font-semibold text-white text-sm">\${f.name}</p>
                <p class="text-xs text-gray-400">\${f.phone || 'No phone'}</p>
              </div>
              <span class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">\${f.zone || 'Unassigned'}</span>
            </li>
          \`).join('');
        }

        // Render Collections Table
        const collectionsTable = document.getElementById('collectionsTable');
        if (collections.length === 0) {
          collectionsTable.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No collection entries recorded.</td></tr>';
        } else {
          collectionsTable.innerHTML = collections.map(c => \`
            <tr class="hover:bg-gray-750 transition">
              <td class="px-6 py-3 font-semibold text-white">\${c.farmers ? c.farmers.name : 'Unknown'}</td>
              <td class="px-6 py-3 text-xs text-gray-400">\${c.farmers ? (c.farmers.zone || '-') : '-'}</td>
              <td class="px-6 py-3 font-bold text-emerald-400">\${Number(c.liters).toFixed(1)} L</td>
              <td class="px-6 py-3">\${c.fat_content ? c.fat_content + '%' : '-'}</td>
              <td class="px-6 py-3 text-xs text-gray-400">\${new Date(c.collection_date).toLocaleString()}</td>
            </tr>
          \`).join('');
        }

      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    }

    async function handleFarmerSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('farmerName').value;
      const phone = document.getElementById('farmerPhone').value;
      const zone = document.getElementById('farmerZone').value;

      await fetch('/api/farmers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, zone })
      });

      document.getElementById('farmerForm').reset();
      closeModal('farmerModal');
      loadDashboardData();
    }

    async function handleCollectionSubmit(e) {
      e.preventDefault();
      const farmer_id = document.getElementById('collectionFarmerId').value;
      const liters = document.getElementById('collectionLiters').value;
      const fat_content = document.getElementById('collectionFat').value;

      await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_id, liters, fat_content })
      });

      document.getElementById('collectionForm').reset();
      closeModal('collectionModal');
      loadDashboardData();
    }

    // Initial Load
    loadDashboardData();
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
  console.log(`Milk Collection Dashboard & API running on port ${PORT}`);
});
