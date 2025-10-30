const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize database with sample data
const initDB = async () => {
  const client = await pool.connect();
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        budget DECIMAL(15,2),
        status VARCHAR(50) DEFAULT 'Planning',
        start_date DATE,
        progress_percent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100),
        hourly_rate DECIMAL(10,2),
        contact VARCHAR(255),
        total_paid DECIMAL(15,2) DEFAULT 0,
        last_payment_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS worker_payments (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER,
        amount DECIMAL(10,2),
        payment_date DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        contact VARCHAR(255),
        rating INTEGER DEFAULT 5,
        total_paid DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        unit_price DECIMAL(10,2),
        min_stock INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if we need sample data
    const projectsCount = await client.query('SELECT COUNT(*) FROM projects');
    const workersCount = await client.query('SELECT COUNT(*) FROM workers');
    const vendorsCount = await client.query('SELECT COUNT(*) FROM vendors');
    const inventoryCount = await client.query('SELECT COUNT(*) FROM inventory');

    if (parseInt(projectsCount.rows[0].count) === 0) {
      console.log('📊 Adding sample projects...');
      await client.query(`
        INSERT INTO projects (name, budget, status, progress_percent) VALUES 
        ('Lagos Luxury Apartments', 25000000, 'Active', 35),
        ('Abuja Commercial Complex', 50000000, 'Planning', 0),
        ('Port Harcourt Residential', 15000000, 'Active', 65)
      `);
    }

    if (parseInt(workersCount.rows[0].count) === 0) {
      console.log('👷 Adding sample workers...');
      await client.query(`
        INSERT INTO workers (name, role, hourly_rate, contact) VALUES 
        ('Chinedu Okoro', 'Site Manager', 8500, '08031234567'),
        ('Amina Bello', 'Architect', 6500, 'amina@construction.com'),
        ('Emeka Nwosu', 'Civil Engineer', 7200, '08039876543')
      `);
    }

    if (parseInt(vendorsCount.rows[0].count) === 0) {
      console.log('🏢 Adding sample vendors...');
      await client.query(`
        INSERT INTO vendors (name, category, contact, rating) VALUES 
        ('Dangote Cement', 'Materials', 'orders@dangote.com', 5),
        ('Julius Berger', 'Contractors', 'info@juliusberger.com', 4),
        ('CCECC Nigeria', 'Engineering', 'contact@ccecc.com', 4)
      `);
    }

    if (parseInt(inventoryCount.rows[0].count) === 0) {
      console.log('📦 Adding sample inventory...');
      await client.query(`
        INSERT INTO inventory (name, category, quantity, unit_price, min_stock) VALUES 
        ('Portland Cement', 'Materials', 500, 4500, 100),
        ('Steel Reinforcement', 'Materials', 200, 8500, 50),
        ('Electrical Wires', 'Electrical', 150, 3200, 30),
        ('PVC Pipes', 'Plumbing', 300, 2800, 40),
        ('Paint (20L)', 'Finishing', 25, 18500, 10)
      `);
    }

    console.log('✅ Database initialized with sample data');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  } finally {
    client.release();
  }
};

initDB();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Real Estate API WITH SAMPLE DATA',
    timestamp: new Date().toISOString(),
    data: 'Sample projects, workers, vendors, and inventory included'
  });
});

// PROJECTS ENDPOINTS
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  const { name, budget, start_date, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO projects (name, budget, start_date, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, budget, start_date, status]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const { name, budget, status, progress_percent } = req.body;
  try {
    const result = await pool.query(
      'UPDATE projects SET name=$1, budget=$2, status=$3, progress_percent=$4 WHERE id=$5 RETURNING *',
      [name, budget, status, progress_percent, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id=$1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WORKERS ENDPOINTS
app.get('/api/workers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM workers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workers', async (req, res) => {
  const { name, role, hourly_rate, contact } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO workers (name, role, hourly_rate, contact) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, role, hourly_rate, contact]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/workers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, hourly_rate, contact } = req.body;
  try {
    const result = await pool.query(
      'UPDATE workers SET name=$1, role=$2, hourly_rate=$3, contact=$4 WHERE id=$5 RETURNING *',
      [name, role, hourly_rate, contact, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/workers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM workers WHERE id=$1', [id]);
    res.json({ message: 'Worker deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WORKER PAYMENTS
app.post('/api/workers/:id/payments', async (req, res) => {
  const { id } = req.params;
  const { amount, payment_date, description } = req.body;
  try {
    await pool.query('BEGIN');
    
    const paymentResult = await pool.query(
      'INSERT INTO worker_payments (worker_id, amount, payment_date, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, amount, payment_date, description]
    );
    
    await pool.query(
      'UPDATE workers SET total_paid = COALESCE(total_paid, 0) + $1, last_payment_date = $2 WHERE id = $3',
      [amount, payment_date, id]
    );
    
    await pool.query('COMMIT');
    res.json(paymentResult.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// VENDORS ENDPOINTS
app.get('/api/vendors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vendors', async (req, res) => {
  const { name, category, contact, rating } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO vendors (name, category, contact, rating) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, category, contact, rating]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// INVENTORY ENDPOINTS
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  const { name, category, quantity, unit_price, min_stock } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO inventory (name, category, quantity, unit_price, min_stock) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, category, quantity, unit_price, min_stock]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, unit_price, min_stock } = req.body;
  try {
    const result = await pool.query(
      'UPDATE inventory SET name=$1, category=$2, quantity=$3, unit_price=$4, min_stock=$5 WHERE id=$6 RETURNING *',
      [name, category, quantity, unit_price, min_stock, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM inventory WHERE id=$1', [id]);
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 REAL ESTATE API WITH SAMPLE DATA running on port ${PORT}`);
  console.log(`✅ Sample projects, workers, vendors, and inventory included`);
  console.log(`💰 All prices in Nigerian Naira (₦)`);
});
