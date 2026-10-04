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

// Root health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Milk Collection API is running!' });
});

// ==================== FARMERS ENDPOINTS ====================

// GET /api/farmers - Fetch all registered dairy farmers
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

// POST /api/farmers - Register a new dairy farmer
app.post('/api/farmers', async (req, res) => {
  try {
    const { name, phone, zone } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Farmer name is required' });
    }

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

// GET /api/collections - Fetch collection records with farmer details
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

// POST /api/collections - Log daily milk collection
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
  console.log(`Milk Collection Server listening on port ${PORT}`);
});
