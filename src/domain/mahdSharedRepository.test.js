import test from 'node:test';
import assert from 'node:assert/strict';
import { createMahdSharedRepository } from './mahdSharedRepository.js';

test('يقرأ كيانات Workspace ويحوّل حقول SQLite إلى نموذج مَهَد', async () => {
  const calls = [];
  const api = {
    async listEntities(workspaceId) {
      calls.push(['list', workspaceId]);
      return {
        clients: [{ id: 'c1', workspace_id: workspaceId, name: 'عميل' }],
        projects: [{ id: 'p1', client_id: 'c1', project_type: 'campaign' }],
        tasks: [{ id: 't1', project_id: 'p1', assignee_user_id: 'u1', due_date: '2026-08-20' }],
        deliverables: [],
        internalWorks: [],
      };
    },
    async createEntity(workspaceId, entity, record) {
      calls.push(['create', workspaceId, entity, record]);
      return { entity: { id: record.id, workspace_id: workspaceId, client_id: record.clientId } };
    },
  };
  const repository = createMahdSharedRepository({ workspaceId: 'w1', api });
  const state = await repository.load();
  assert.equal(state.projects[0].clientId, 'c1');
  assert.equal(state.tasks[0].assigneeId, 'u1');
  assert.equal(state.tasks[0].dueDate, '2026-08-20');
  await repository.saveClient({ id: 'c2', name: 'عميل ثانٍ' });
  assert.deepEqual(calls[1].slice(0, 3), ['create', 'w1', 'clients']);
});

test('يرفض إنشاء Shared Repository بلا Workspace', () => {
  assert.throws(() => createMahdSharedRepository(), /معرّف Workspace/);
});
