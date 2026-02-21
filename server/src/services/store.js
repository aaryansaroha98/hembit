import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { createId } from '../utils/id.js';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/data.json');
const STORE_ROW_ID = 1;

let cache = null;
let mode = 'file';
let initialized = false;
let pool = null;
let persistQueue = Promise.resolve();

const defaultSettings = {
  serviceContact: {
    supportEmail: 'support@hembit.in',
    contactNumber: '+91 00000 00000',
    contactHours: 'Mon-Sat 9AM-7PM IST',
  },
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getPool() {
  if (pool) {
    return pool;
  }

  const connectionString = String(process.env.DATABASE_URL || '').trim();
  if (!connectionString) {
    return null;
  }

  const useExplicitSsl = !connectionString.includes('sslmode=');
  pool = new Pool({
    connectionString,
    ...(useExplicitSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  pool.on('error', (error) => {
    console.error('[store] postgres pool error', error);
  });

  return pool;
}

function readSeedFile() {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database seed file not found: ${dbPath}`);
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function ensureSettings(db) {
  const serviceContact = db.settings?.serviceContact || {};

  db.settings = {
    ...db.settings,
    serviceContact: {
      supportEmail: serviceContact.supportEmail || defaultSettings.serviceContact.supportEmail,
      contactNumber: serviceContact.contactNumber || defaultSettings.serviceContact.contactNumber,
      contactHours: serviceContact.contactHours || defaultSettings.serviceContact.contactHours,
    },
  };
}

function ensureUserShape(user) {
  user.mobile = user.mobile || '';
  user.country = user.country || '';
  user.pincode = user.pincode || '';
  user.gender = user.gender || '';
  user.age = Number.isFinite(user.age) ? Number(user.age) : null;
  user.addresses = Array.isArray(user.addresses) ? user.addresses : [];
}

function seedAdmin(db) {
  const adminEmail = 'admin@hembit.in';
  const exists = db.users.some((item) => item.email === adminEmail);
  if (!exists) {
    db.users.push({
      id: createId('usr'),
      name: 'HEMBIT Admin',
      email: adminEmail,
      passwordHash: bcrypt.hashSync('Admin@123', 10),
      mobile: '',
      country: '',
      pincode: '',
      gender: '',
      age: null,
      role: 'admin',
      isVerified: true,
      createdAt: new Date().toISOString(),
      addresses: [],
    });
  }
}

function normalizeDbShape(db) {
  const next = db && typeof db === 'object' ? db : {};
  next.slides = Array.isArray(next.slides) ? next.slides : [];
  next.categories = Array.isArray(next.categories) ? next.categories : [];
  next.products = Array.isArray(next.products) ? next.products : [];
  next.content = next.content && typeof next.content === 'object' ? next.content : {};
  next.hbProductions = Array.isArray(next.hbProductions) ? next.hbProductions : [];
  next.users = Array.isArray(next.users) ? next.users : [];
  next.otpRequests = Array.isArray(next.otpRequests) ? next.otpRequests : [];
  next.orders = Array.isArray(next.orders) ? next.orders : [];
  next.newsletterSubscribers = Array.isArray(next.newsletterSubscribers) ? next.newsletterSubscribers : [];
  next.mailLogs = Array.isArray(next.mailLogs) ? next.mailLogs : [];

  ensureSettings(next);
  next.users.forEach(ensureUserShape);
  seedAdmin(next);

  return next;
}

function persistFile(snapshot) {
  fs.writeFileSync(dbPath, JSON.stringify(snapshot, null, 2));
}

async function ensurePostgresSchema(pgPool) {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function savePostgres(snapshot) {
  const pgPool = getPool();
  if (!pgPool) {
    throw new Error('Postgres pool is not initialized');
  }

  await pgPool.query(
    `
      INSERT INTO app_state (id, data, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
    `,
    [STORE_ROW_ID, JSON.stringify(snapshot)]
  );
}

function queuePersist() {
  const snapshot = deepClone(cache);

  persistQueue = persistQueue
    .catch((error) => {
      console.error('[store] previous persist failed, continuing queue', error);
    })
    .then(async () => {
      if (mode === 'postgres') {
        await savePostgres(snapshot);
      } else {
        persistFile(snapshot);
      }
    })
    .catch((error) => {
      console.error(`[store] failed to persist state in ${mode} mode`, error);
    });
}

function assertInitialized() {
  if (!initialized || !cache) {
    throw new Error('Store not initialized. Call initStore() before readDb/writeDb.');
  }
}

export async function initStore() {
  if (initialized) {
    return;
  }

  const pgPool = getPool();

  if (pgPool) {
    mode = 'postgres';
    await ensurePostgresSchema(pgPool);
    const result = await pgPool.query('SELECT data FROM app_state WHERE id = $1 LIMIT 1', [STORE_ROW_ID]);

    if (result.rowCount > 0) {
      cache = normalizeDbShape(result.rows[0].data);
    } else {
      cache = normalizeDbShape(readSeedFile());
      await savePostgres(cache);
    }
  } else {
    mode = 'file';
    cache = normalizeDbShape(readSeedFile());
    persistFile(cache);
  }

  initialized = true;
  console.log(`[store] initialized in ${mode} mode`);
}

export function readDb() {
  assertInitialized();
  return cache;
}

export function writeDb(updater) {
  assertInitialized();
  updater(cache);
  cache = normalizeDbShape(cache);
  queuePersist();
  return cache;
}

export async function closeStore() {
  await persistQueue;
  if (pool) {
    await pool.end();
    pool = null;
  }
}
