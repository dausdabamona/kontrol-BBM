import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('bbm_control.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL -- 'vehicle' or 'equipment'
  );

  CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    asset_id INTEGER NOT NULL,
    amount_liters REAL NOT NULL,
    notes TEXT,
    photo TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(asset_id) REFERENCES assets(id)
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    amount_liters REAL NOT NULL,
    cost REAL NOT NULL,
    payment_type TEXT NOT NULL,
    notes TEXT,
    photo TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed default admin if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)').run('admin', 'admin123', 'Administrator', 'admin');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' })); // Increased limit for base64 photos

  // Auth Route
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT id, username, full_name, role FROM users WHERE username = ? AND password = ?').get(username, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Username atau password salah' });
    }
  });

  // Admin: User Management
  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, username, full_name, role FROM users').all();
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { username, password, full_name, role } = req.body;
    try {
      db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)').run(username, password, full_name, role);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Admin: Asset Management
  app.get('/api/assets', (req, res) => {
    const assets = db.prepare('SELECT * FROM assets').all();
    res.json(assets);
  });

  app.post('/api/assets', (req, res) => {
    const { name, type } = req.body;
    try {
      db.prepare('INSERT INTO assets (name, type) VALUES (?, ?)').run(name, type);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/assets/:id', (req, res) => {
    db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // API Routes for Usage and Purchases
  app.post('/api/usage', (req, res) => {
    const { date, user_id, asset_id, amount_liters, notes, photo } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO usage (date, user_id, asset_id, amount_liters, notes, photo) VALUES (?, ?, ?, ?, ?, ?)');
      const info = stmt.run(date, user_id, asset_id, amount_liters, notes, photo);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/purchases', (req, res) => {
    const { date, user_id, amount_liters, cost, payment_type, notes, photo } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO purchases (date, user_id, amount_liters, cost, payment_type, notes, photo) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(date, user_id, amount_liters, cost, payment_type, notes, photo);
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/reports', (req, res) => {
    try {
      const usage = db.prepare(`
        SELECT u.*, us.full_name as user_name, us.role, a.name as asset_name 
        FROM usage u 
        JOIN users us ON u.user_id = us.id 
        JOIN assets a ON u.asset_id = a.id 
        ORDER BY u.timestamp DESC
      `).all();
      const purchases = db.prepare(`
        SELECT p.*, us.full_name as user_name, us.role 
        FROM purchases p 
        JOIN users us ON p.user_id = us.id 
        ORDER BY p.timestamp DESC
      `).all();
      res.json({ usage, purchases });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
