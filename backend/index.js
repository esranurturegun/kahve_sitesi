const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const dbUnavailableMessage = 'Veritabanı şu anda erişilemez. MySQL sunucusunu açıp tekrar deneyin.';
let databaseReady = false;
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 5000,
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      session_token VARCHAR(128) UNIQUE,
      session_token_expiry DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await pool.query('ALTER TABLE users ADD COLUMN session_token_expiry DATETIME NULL');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS favoriler (
      idfavoriler INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      place_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      formatted_address VARCHAR(500),
      rating DECIMAL(3, 1),
      image VARCHAR(1000),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_place (user_id, place_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    await pool.query('ALTER TABLE favoriler ADD COLUMN user_id INT NULL');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gidilecekler (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      place_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      formatted_address VARCHAR(500),
      rating DECIMAL(3, 1),
      image VARCHAR(1000),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_place (user_id, place_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  for (const table of ['favoriler', 'gidilecekler']) {
    for (const column of [
      'ADD COLUMN data_source VARCHAR(80) DEFAULT \'Google Places\'',
      'ADD COLUMN fetched_at DATETIME NULL',
    ]) {
      try {
        await pool.query(`ALTER TABLE ${table} ${column}`);
      } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') throw error;
      }
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS yorumlar (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      place_id VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX place_reviews (place_id)
    )
  `);

  // İşletme Sahipleri Tablosu
  await pool.query(`
    CREATE TABLE IF NOT EXISTS isletme_sahipleri (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      session_token VARCHAR(128) UNIQUE,
      session_token_expiry DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await pool.query('ALTER TABLE isletme_sahipleri ADD COLUMN session_token_expiry DATETIME NULL');
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }

  // İşletmeler Tablosu
  await pool.query(`
    CREATE TABLE IF NOT EXISTS isletmeler (
      isletme_id INT AUTO_INCREMENT PRIMARY KEY,
      sahip_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      aciklama VARCHAR(190),
      adres VARCHAR(255) NOT NULL,
      il VARCHAR(25) NOT NULL,
      ilce VARCHAR(50),
      enlem DECIMAL(10,7) NOT NULL,
      boylam DECIMAL(10,7) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sahip_id) REFERENCES isletme_sahipleri(id) ON DELETE CASCADE,
      INDEX isletme_location (il, ilce)
    )
  `);

  // İşletme Resimleri Tablosu
  await pool.query(`
    CREATE TABLE IF NOT EXISTS isletme_resimleri (
      id INT AUTO_INCREMENT PRIMARY KEY,
      isletme_id INT NOT NULL,
      dosya_yolu VARCHAR(500) NOT NULL,
      sira INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (isletme_id) REFERENCES isletmeler(isletme_id) ON DELETE CASCADE,
      INDEX isletme_resim (isletme_id)
    )
  `);

  // Menu Kategorileri Tablosu
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_kategorileri (
      id INT AUTO_INCREMENT PRIMARY KEY,
      isletme_id INT NOT NULL,
      name VARCHAR(150) NOT NULL,
      sira INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (isletme_id) REFERENCES isletmeler(isletme_id) ON DELETE CASCADE,
      INDEX kategori_isletme (isletme_id)
    )
  `);

  // Menu Ürünleri Tablosu
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_urunleri (
      id INT AUTO_INCREMENT PRIMARY KEY,
      kategori_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      aciklama TEXT,
      fiyat DECIMAL(8,2),
      dosya_yolu VARCHAR(500),
      sira INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (kategori_id) REFERENCES menu_kategorileri(id) ON DELETE CASCADE,
      INDEX urun_kategori (kategori_id)
    )
  `);

  // Yorum Resimleri Tablosu
  await pool.query(`
    CREATE TABLE IF NOT EXISTS yorum_resimleri (
      id INT AUTO_INCREMENT PRIMARY KEY,
      yorum_id INT NOT NULL,
      dosya_yolu VARCHAR(500) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (yorum_id) REFERENCES yorumlar(id) ON DELETE CASCADE,
      INDEX yorum_resim (yorum_id)
    )
  `);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function passwordsMatch(password, storedHash) {
  const [salt, hash] = String(storedHash).split(':');
  if (!salt || !hash) return false;
  const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derivedHash, 'hex'));
}

async function requireUser(req, res, next) {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Bu işlem için giriş yapmalısınız.' });

  const [users] = await pool.query('SELECT id, name, email, session_token_expiry FROM users WHERE session_token = ?', [token]);
  if (!users[0]) return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
  
  const now = new Date();
  if (users[0].session_token_expiry && new Date(users[0].session_token_expiry) < now) {
    return res.status(401).json({ error: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.' });
  }
  
  req.user = users[0];
  return next();
}

app.post('/api/auth/register', async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Ad, e-posta ve en az 6 karakterli şifre gereklidir.' });
  }

  try {
    const token = crypto.randomBytes(48).toString('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, session_token, session_token_expiry) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashPassword(password), token, expiryDate]
    );
    await pool.query('UPDATE favoriler SET user_id = ? WHERE user_id IS NULL', [result.insertId]);
    return res.status(201).json({ user: { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase() }, token });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('Register: Email already exists -', email);
      return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
    }
    console.error('Register error:', error.message || error);
    return res.status(500).json({ error: 'Kayıt oluşturulamadı.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { email, password } = req.body;
  try {
    const [users] = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email?.trim().toLowerCase()]);
    if (!users[0] || !passwordsMatch(password || '', users[0].password_hash)) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }
    const token = crypto.randomBytes(48).toString('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    await pool.query('UPDATE users SET session_token = ?, session_token_expiry = ? WHERE id = ?', [token, expiryDate, users[0].id]);
    return res.json({ user: { id: users[0].id, name: users[0].name, email: users[0].email }, token });
  } catch (error) {
    console.error('Login error:', error.message || error);
    return res.status(500).json({ error: 'Giriş yapılamadı.' });
  }
});

app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: req.user }));

app.post('/api/auth/logout', requireUser, async (req, res) => {
  await pool.query('UPDATE users SET session_token = NULL WHERE id = ?', [req.user.id]);
  return res.status(204).end();
});

app.get('/api/favorites', requireUser, async (req, res) => {
  try {
    const [favorites] = await pool.query(
      'SELECT idfavoriler, place_id, name, formatted_address, rating, image, data_source, fetched_at FROM favoriler WHERE user_id = ? ORDER BY idfavoriler DESC', [req.user.id]
    );
    return res.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error.message || error);
    return res.status(500).json({ error: 'Favoriler alınamadı.' });
  }
});

app.post('/api/favorites', requireUser, async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { place_id, name, formatted_address, rating, image, data_source, fetched_at } = req.body;

  if (!place_id || !name) {
    return res.status(400).json({ error: 'place_id ve name gereklidir.' });
  }

  try {
    await pool.query(
      `INSERT INTO favoriler (user_id, place_id, name, formatted_address, rating, image, data_source, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), name = VALUES(name), formatted_address = VALUES(formatted_address), rating = VALUES(rating), image = VALUES(image), data_source = VALUES(data_source), fetched_at = VALUES(fetched_at)`,
      [req.user.id, place_id, name, formatted_address || null, rating || null, image || null, data_source || 'Google Places', fetched_at || null]
    );
    const [favorites] = await pool.query('SELECT idfavoriler, place_id, name, formatted_address, rating, image, data_source, fetched_at FROM favoriler WHERE user_id = ? AND place_id = ?', [req.user.id, place_id]);
    return res.status(201).json(favorites[0]);
  } catch (error) {
    console.error('Add favorite error:', error.message || error);
    return res.status(500).json({ error: 'Favori kaydedilemedi.' });
  }
});

app.delete('/api/favorites/:placeId', requireUser, async (req, res) => {
  try {
    await pool.query('DELETE FROM favoriler WHERE user_id = ? AND place_id = ?', [req.user.id, req.params.placeId]);
    return res.status(204).end();
  } catch (error) {
    console.error('Delete favorite error:', error.message || error);
    return res.status(500).json({ error: 'Favori silinemedi.' });
  }
});

app.get('/api/planned', requireUser, async (req, res) => {
  try {
    const [places] = await pool.query(
      'SELECT id, place_id, name, formatted_address, rating, image, data_source, fetched_at FROM gidilecekler WHERE user_id = ? ORDER BY id DESC', [req.user.id]
    );
    return res.json(places);
  } catch (error) {
    console.error('Get planned places error:', error.message || error);
    return res.status(500).json({ error: 'Gidilecekler yüklenemedi.' });
  }
});

app.post('/api/planned', requireUser, async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { place_id, name, formatted_address, rating, image, data_source, fetched_at } = req.body;
  if (!place_id || !name) return res.status(400).json({ error: 'place_id ve name gereklidir.' });
  try {
    await pool.query(
      `INSERT INTO gidilecekler (user_id, place_id, name, formatted_address, rating, image, data_source, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), formatted_address = VALUES(formatted_address), rating = VALUES(rating), image = VALUES(image), data_source = VALUES(data_source), fetched_at = VALUES(fetched_at)`,
      [req.user.id, place_id, name, formatted_address || null, rating || null, image || null, data_source || 'Google Places', fetched_at || null]
    );
    const [places] = await pool.query('SELECT id, place_id, name, formatted_address, rating, image, data_source, fetched_at FROM gidilecekler WHERE user_id = ? AND place_id = ?', [req.user.id, place_id]);
    return res.status(201).json(places[0]);
  } catch (error) {
    console.error('Add planned place error:', error.message || error);
    return res.status(500).json({ error: 'Gidilecekler listesine eklenemedi.' });
  }
});

app.delete('/api/planned/:placeId', requireUser, async (req, res) => {
  try {
    await pool.query('DELETE FROM gidilecekler WHERE user_id = ? AND place_id = ?', [req.user.id, req.params.placeId]);
    return res.status(204).end();
  } catch (error) {
    console.error('Delete planned place error:', error.message || error);
    return res.status(500).json({ error: 'Gidilecekler listesinden çıkarılamadı.' });
  }
});

app.get('/api/cafes', async (req, res) => {
  const { ilce } = req.query;

  if (!ilce) {
    return res.status(400).json({ error: 'ilce query parametresi gereklidir.' });
  }

  if (!process.env.GOOGLE_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_API_KEY tanimli degil.' });
  }

  const params = new URLSearchParams({
    query: `coffee+${ilce}+kocaeli`,
    type: 'cafe',
    key: process.env.GOOGLE_API_KEY,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
    );
    const data = await response.json();

    const fetchedAt = new Date().toISOString();
    return res.status(response.ok ? 200 : response.status).json({
      ...data,
      results: (data.results || []).map((place) => ({ ...place, data_source: 'Google Places', fetched_at: fetchedAt })),
    });
  } catch (error) {
    console.error('Cafes API error:', error.message || error);
    return res.status(502).json({ error: 'Google Places API istegi basarisiz oldu.' });
  }
});

app.get('/api/reviews/:placeId', async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  try {
    const [reviews] = await pool.query(
      'SELECT yorumlar.id, yorumlar.name, yorumlar.text, yorumlar.created_at FROM yorumlar WHERE place_id = ? ORDER BY yorumlar.created_at DESC',
      [req.params.placeId]
    );
    return res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error.message || error);
    return res.status(500).json({ error: 'Yorumlar alınamadı.' });
  }
});

app.post('/api/reviews', requireUser, async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { place_id, text } = req.body;
  if (!place_id || !text?.trim()) return res.status(400).json({ error: 'Mekan ve yorum metni gereklidir.' });

  try {
    const [result] = await pool.query(
      'INSERT INTO yorumlar (user_id, place_id, name, text) VALUES (?, ?, ?, ?)',
      [req.user.id, place_id, req.user.name, text.trim()]
    );
    const [reviews] = await pool.query(
      'SELECT id, name, text, created_at FROM yorumlar WHERE id = ?',
      [result.insertId]
    );
    return res.status(201).json(reviews[0]);
  } catch (error) {
    console.error('Post review error:', error.message || error);
    return res.status(500).json({ error: 'Yorum kaydedilemedi.' });
  }
});

app.get('/api/weather', async (req, res) => {
  const { lat, lon } = req.query;
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!lat || !lon || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'lat ve lon sayisal query parametreleri gereklidir.' });
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current_weather: 'true',
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    const data = await response.json();

    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    console.error('Weather API error:', error.message || error);
    return res.status(502).json({ error: 'Open-Meteo API istegi basarisiz oldu.' });
  }
});

// ========== İŞLETME SAHİPLERİ AUTH ENDPOINTS ==========

async function requireOwner(req, res, next) {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Bu işlem için giriş yapmalısınız.' });

  const [owners] = await pool.query('SELECT id, name, email, session_token_expiry FROM isletme_sahipleri WHERE session_token = ?', [token]);
  if (!owners[0]) return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
  
  const now = new Date();
  if (owners[0].session_token_expiry && new Date(owners[0].session_token_expiry) < now) {
    return res.status(401).json({ error: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.' });
  }
  
  req.owner = owners[0];
  return next();
}

app.post('/api/owner/auth/register', async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ error: 'Ad, e-posta ve en az 6 karakterli şifre gereklidir.' });
  }

  try {
    const token = crypto.randomBytes(48).toString('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    
    const [result] = await pool.query(
      'INSERT INTO isletme_sahipleri (name, email, password_hash, session_token, session_token_expiry) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hashPassword(password), token, expiryDate]
    );
    return res.status(201).json({ user: { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase() }, token });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('Owner Register: Email already exists -', email);
      return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
    }
    console.error('Owner Register error:', error.message || error);
    return res.status(500).json({ error: 'Kayıt oluşturulamadı.' });
  }
});

app.post('/api/owner/auth/login', async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { email, password } = req.body;
  try {
    const [owners] = await pool.query('SELECT id, name, email, password_hash FROM isletme_sahipleri WHERE email = ?', [email?.trim().toLowerCase()]);
    if (!owners[0] || !passwordsMatch(password || '', owners[0].password_hash)) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
    }
    const token = crypto.randomBytes(48).toString('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    await pool.query('UPDATE isletme_sahipleri SET session_token = ?, session_token_expiry = ? WHERE id = ?', [token, expiryDate, owners[0].id]);
    return res.json({ user: { id: owners[0].id, name: owners[0].name, email: owners[0].email }, token });
  } catch (error) {
    console.error('Owner Login error:', error.message || error);
    return res.status(500).json({ error: 'Giriş yapılamadı.' });
  }
});

app.get('/api/owner/me', requireOwner, (req, res) => res.json({ user: req.owner }));

app.post('/api/owner/auth/logout', requireOwner, async (req, res) => {
  await pool.query('UPDATE isletme_sahipleri SET session_token = NULL WHERE id = ?', [req.owner.id]);
  return res.status(204).end();
});

// ========== İŞLETMELER ENDPOINTS ==========

app.get('/api/owner/businesses', requireOwner, async (req, res) => {
  try {
    const [businesses] = await pool.query(
      'SELECT * FROM isletmeler WHERE sahip_id = ? ORDER BY created_at DESC',
      [req.owner.id]
    );
    return res.json(businesses);
  } catch (error) {
    console.error('Get businesses error:', error.message || error);
    return res.status(500).json({ error: 'İşletmeler alınamadı.' });
  }
});

app.post('/api/owner/businesses', requireOwner, async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { name, aciklama, adres, il, ilce, enlem, boylam } = req.body;
  if (!name?.trim() || !adres?.trim() || !il?.trim() || !enlem || !boylam) {
    return res.status(400).json({ error: 'İşletme adı, adres, il, enlem ve boylam zorunludur.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO isletmeler (sahip_id, name, aciklama, adres, il, ilce, enlem, boylam)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.owner.id, name.trim(), aciklama || null, adres.trim(), il.trim(), ilce || null, enlem, boylam]
    );
    const [newBusiness] = await pool.query('SELECT * FROM isletmeler WHERE isletme_id = ?', [result.insertId]);
    return res.status(201).json(newBusiness[0]);
  } catch (error) {
    console.error('Create business error:', error.message || error);
    return res.status(500).json({ error: 'İşletme oluşturulamadı.' });
  }
});

app.put('/api/owner/businesses/:id', requireOwner, async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { name, aciklama, adres, il, ilce, enlem, boylam } = req.body;
  if (!name?.trim() || !adres?.trim() || !il?.trim() || !enlem || !boylam) {
    return res.status(400).json({ error: 'İşletme adı, adres, il, enlem ve boylam zorunludur.' });
  }

  try {
    await pool.query(
      `UPDATE isletmeler SET name = ?, aciklama = ?, adres = ?, il = ?, ilce = ?, enlem = ?, boylam = ? 
       WHERE isletme_id = ? AND sahip_id = ?`,
      [name.trim(), aciklama || null, adres.trim(), il.trim(), ilce || null, enlem, boylam, req.params.id, req.owner.id]
    );
    const [updated] = await pool.query('SELECT * FROM isletmeler WHERE isletme_id = ?', [req.params.id]);
    return res.json(updated[0]);
  } catch (error) {
    console.error('Update business error:', error.message || error);
    return res.status(500).json({ error: 'İşletme güncellenemedi.' });
  }
});

// ========== MENU KATEGORİLERİ ENDPOINTS ==========

app.get('/api/owner/menu-categories/:businessId', requireOwner, async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM menu_kategorileri WHERE isletme_id = ? ORDER BY sira',
      [req.params.businessId]
    );
    return res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error.message || error);
    return res.status(500).json({ error: 'Kategoriler alınamadı.' });
  }
});

app.post('/api/owner/menu-categories', requireOwner, async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { isletme_id, name } = req.body;
  if (!isletme_id || !name?.trim()) {
    return res.status(400).json({ error: 'İşletme ID ve kategori adı gereklidir.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO menu_kategorileri (isletme_id, name) VALUES (?, ?)',
      [isletme_id, name.trim()]
    );
    const [newCategory] = await pool.query('SELECT * FROM menu_kategorileri WHERE id = ?', [result.insertId]);
    return res.status(201).json(newCategory[0]);
  } catch (error) {
    console.error('Create category error:', error.message || error);
    return res.status(500).json({ error: 'Kategori oluşturulamadı.' });
  }
});

// ========== MENU ÜRÜNLERI ENDPOINTS ==========

app.get('/api/owner/menu-items/:categoryId', requireOwner, async (req, res) => {
  try {
    const [items] = await pool.query(
      'SELECT * FROM menu_urunleri WHERE kategori_id = ? ORDER BY sira',
      [req.params.categoryId]
    );
    return res.json(items);
  } catch (error) {
    console.error('Get items error:', error.message || error);
    return res.status(500).json({ error: 'Ürünler alınamadı.' });
  }
});

app.post('/api/owner/menu-items', requireOwner, async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { kategori_id, name, aciklama, fiyat, dosya_yolu } = req.body;
  if (!kategori_id || !name?.trim()) {
    return res.status(400).json({ error: 'Kategori ID ve ürün adı gereklidir.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO menu_urunleri (kategori_id, name, aciklama, fiyat, dosya_yolu)
       VALUES (?, ?, ?, ?, ?)`,
      [kategori_id, name.trim(), aciklama || null, fiyat || null, dosya_yolu || null]
    );
    const [newItem] = await pool.query('SELECT * FROM menu_urunleri WHERE id = ?', [result.insertId]);
    return res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Create item error:', error.message || error);
    return res.status(500).json({ error: 'Ürün oluşturulamadı.' });
  }
});

// ========== GALERI ENDPOINTS ==========

app.get('/api/owner/gallery/:businessId', requireOwner, async (req, res) => {
  try {
    const [images] = await pool.query(
      'SELECT * FROM isletme_resimleri WHERE isletme_id = ? ORDER BY sira',
      [req.params.businessId]
    );
    return res.json(images);
  } catch (error) {
    console.error('Get gallery error:', error.message || error);
    return res.status(500).json({ error: 'Galeresi alınamadı.' });
  }
});

app.post('/api/owner/gallery', requireOwner, async (req, res) => {
  if (!databaseReady) {
    return res.status(503).json({ error: dbUnavailableMessage });
  }

  const { isletme_id, dosya_yolu } = req.body;
  if (!isletme_id || !dosya_yolu?.trim()) {
    return res.status(400).json({ error: 'İşletme ID ve resim yolu gereklidir.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO isletme_resimleri (isletme_id, dosya_yolu) VALUES (?, ?)',
      [isletme_id, dosya_yolu.trim()]
    );
    const [newImage] = await pool.query('SELECT * FROM isletme_resimleri WHERE id = ?', [result.insertId]);
    return res.status(201).json(newImage[0]);
  } catch (error) {
    console.error('Create gallery image error:', error.message || error);
    return res.status(500).json({ error: 'Resim eklenemedi.' });
  }
});

async function initializeDatabase() {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await ensureSchema();
      databaseReady = true;
      console.log('Veritabani semasi hazir.');
      return true;
    } catch (error) {
      console.error(`Veritabani semasi hazirlanamadi (deneme ${attempt}/5):`, error.message || error.code);
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.warn('Veritabani kullanilamiyor. MySQL servisini kontrol edin; sunucu yine de aciliyor.');
  return false;
}

initializeDatabase().finally(() => {
  app.listen(port, () => console.log(`Backend ${port} portunda calisiyor.`));
});
