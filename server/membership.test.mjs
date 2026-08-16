import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, closeDatabase } from './db.mjs';
import { acceptWorkspaceInvitation, createSession, createUser, createWorkspaceForUser, createWorkspaceInvitation, getActiveMembership } from './auth.mjs';

function withDatabase(callback) {
  const db = createDatabase(':memory:');
  try { return callback(db); } finally { closeDatabase(db); }
}

test('ينشئ مساحة عمل ويربط المستخدم الأول بدور owner', () => {
  withDatabase((db) => {
    const user = createUser(db, { email: 'owner@agency.test', displayName: 'المالك', password: 'strong-pass-1' });
    const workspace = createWorkspaceForUser(db, user, { name: 'وكالة مَهَد' });
    const membership = getActiveMembership(db, user.id, workspace.id);
    assert.equal(membership.role, 'owner');
    assert.equal(membership.status, 'active');
  });
});

test('ينشئ دعوة ويقبلها المستخدم المطابق للبريد', () => {
  withDatabase((db) => {
    const owner = createUser(db, { email: 'owner@agency.test', displayName: 'المالك', password: 'strong-pass-1' });
    const member = createUser(db, { email: 'member@agency.test', displayName: 'الموظف', password: 'strong-pass-2' });
    const workspace = createWorkspaceForUser(db, owner, { name: 'وكالة مَهَد' });
    const invitation = createWorkspaceInvitation(db, { workspaceId: workspace.id, invitedBy: owner.id, email: member.email, role: 'content_writer' });
    const membership = acceptWorkspaceInvitation(db, { token: invitation.token, user: member });
    assert.equal(membership.user_id, member.id);
    assert.equal(membership.role, 'content_writer');
    assert.equal(db.prepare("SELECT status FROM workspace_invitations WHERE id = ?").get(invitation.id).status, 'accepted');
  });
});

test('يرفض قبول الدعوة من مستخدم لا يطابق البريد', () => {
  withDatabase((db) => {
    const owner = createUser(db, { email: 'owner@agency.test', displayName: 'المالك', password: 'strong-pass-1' });
    const member = createUser(db, { email: 'member@agency.test', displayName: 'الموظف', password: 'strong-pass-2' });
    const other = createUser(db, { email: 'other@agency.test', displayName: 'آخر', password: 'strong-pass-3' });
    const workspace = createWorkspaceForUser(db, owner, { name: 'وكالة مَهَد' });
    const invitation = createWorkspaceInvitation(db, { workspaceId: workspace.id, invitedBy: owner.id, email: member.email });
    assert.throws(() => acceptWorkspaceInvitation(db, { token: invitation.token, user: other }), /ليست موجهة/);
  });
});
