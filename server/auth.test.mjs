import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, closeDatabase } from './db.mjs';
import { authenticateUser, createSession, createUser, revokeSession, userFromRequest } from './auth.mjs';

function withDatabase(callback) {
  const db = createDatabase(':memory:');
  try { return callback(db); } finally { closeDatabase(db); }
}

test('ينشئ مستخدمًا ويخزن كلمة المرور كقيمة مشتقة لا كنص صريح', () => {
  withDatabase((db) => {
    const user = createUser(db, { email: 'owner@example.com', displayName: 'المالك', password: 'strong-pass-1' });
    assert.equal(user.email, 'owner@example.com');
    const stored = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id).password_hash;
    assert.match(stored, /^scrypt:/);
    assert.notEqual(stored, 'strong-pass-1');
  });
});

test('يسجل الدخول بكلمة صحيحة ويرفض الخاطئة', () => {
  withDatabase((db) => {
    createUser(db, { email: 'member@example.com', displayName: 'موظف', password: 'strong-pass-2' });
    assert.equal(authenticateUser(db, { email: 'member@example.com', password: 'strong-pass-2' }).email, 'member@example.com');
    assert.throws(() => authenticateUser(db, { email: 'member@example.com', password: 'wrong-pass' }), /بيانات الدخول/);
  });
});

test('يستعيد الجلسة ويلغيها من cookie token', () => {
  withDatabase((db) => {
    const user = createUser(db, { email: 'session@example.com', displayName: 'عضو', password: 'strong-pass-3' });
    const session = createSession(db, user.id);
    const request = { headers: { cookie: `mahd_session=${encodeURIComponent(session.token)}` } };
    assert.equal(userFromRequest(db, request).id, user.id);
    revokeSession(db, session.token);
    assert.equal(userFromRequest(db, request), null);
  });
});
