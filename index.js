const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Milk Collection API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
