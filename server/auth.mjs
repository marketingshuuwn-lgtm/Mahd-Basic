import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_DAYS = 7;
const PASSWORD_KEY_LENGTH = 64;

function now() { return new Date(); }
function iso(date = now()) { return date.toISOString(); }
function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex');
  return `scrypt:${salt}:${hash}`;
}
function verifyPassword(password, encoded) {
  const [scheme, salt, expectedHex] = String(encoded || '').split(':');
  if (scheme !== 'scrypt' || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter(([key, value]) => key && value));
}
function sessionCookie(token, maxAge = SESSION_DAYS * 24 * 60 * 60) {
  return `mahd_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

export function ensureAuthSchema(db) {
  const columns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
  if (!columns.includes('password_hash')) db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
  `);
}

function tokenHash(token) { return scryptSync(token, 'mahd-session-token', 32).toString('hex'); }

export function createUser(db, { email, displayName, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(displayName || '').trim();
  if (!cleanEmail || !cleanName || String(password || '').length < 8) throw new Error('البريد والاسم وكلمة مرور من 8 محارف مطلوبة.');
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(id, cleanEmail, cleanName, hashPassword(password), iso());
  return db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(id);
}

export function authenticateUser(db, { email, password }) {
  const user = db.prepare('SELECT id, email, display_name, password_hash, created_at FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) throw new Error('بيانات الدخول غير صحيحة.');
  return { id: user.id, email: user.email, display_name: user.display_name, created_at: user.created_at };
}

export function createSession(db, userId) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)').run(randomUUID(), userId, tokenHash(token), iso(expires), iso());
  return { token, expiresAt: expires.toISOString() };
}

export function revokeSession(db, token) {
  if (!token) return;
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').run(iso(), tokenHash(token));
}

export function userFromRequest(db, req) {
  const token = parseCookies(req.headers.cookie || '').mahd_session;
  if (!token) return null;
  const row = db.prepare(`SELECT u.id, u.email, u.display_name, u.created_at, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`).get(tokenHash(token), iso());
  return row ? { id: row.id, email: row.email, displayName: row.display_name, createdAt: row.created_at, sessionExpiresAt: row.expires_at, token } : null;
}

export { sessionCookie };
