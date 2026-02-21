import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { createId } from '../utils/id.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/data.json');

let cache = null;

function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }

  if (!cache) {
    cache = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    seedAdmin(cache);
    fs.writeFileSync(dbPath, JSON.stringify(cache, null, 2));
  }
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
      role: 'admin',
      isVerified: true,
      createdAt: new Date().toISOString(),
      addresses: [],
    });
  }
}

export function readDb() {
  ensureDb();
  return cache;
}

export function writeDb(updater) {
  ensureDb();
  updater(cache);
  fs.writeFileSync(dbPath, JSON.stringify(cache, null, 2));
  return cache;
}
