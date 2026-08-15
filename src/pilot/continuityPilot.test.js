import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, createProject, createSyncOperation, createTask } from '../domain/mahdModel.js';
import { createMahdRepository } from '../domain/mahdRepository.js';

function storage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('Pilot استمرارية: يعيد فتح مَهَد مع الكيانات وسجل المزامنة دون فقد العلاقة', () => {
  const localStorage = storage();
  const firstSession = createMahdRepository({ storage: localStorage });
  const client = createClient({ id: 'client-continuity', name: 'مستر آرت' });
  const project = createProject({ id: 'project-continuity', clientId: client.id, name: 'التأسيس', type: 'brand-strategy' });
  const task = createTask({ id: 'task-continuity', clientId: client.id, projectId: project.id, title: 'استراتيجية العلامة' });
  const operation = createSyncOperation({ id: 'sync-continuity', entityType: 'task', entityId: task.id, operation: 'create', payload: { title: task.title, projectId: project.id }, status: 'pending_approval' });

  firstSession.saveClient(client);
  firstSession.saveProject(project);
  firstSession.saveTask(task);
  firstSession.saveDraft({ ...task, syncStatus: 'pending_approval', localOnly: true });
  firstSession.saveSyncOperation(operation);

  const reopenedSession = createMahdRepository({ storage: localStorage });
  const state = reopenedSession.load();
  assert.equal(state.clients[0].id, client.id);
  assert.equal(state.projects[0].clientId, client.id);
  assert.equal(state.tasks[0].projectId, project.id);
  assert.equal(state.drafts[0].syncStatus, 'pending_approval');
  assert.equal(state.syncOperations[0].status, 'pending_approval');
  assert.equal(state.syncOperations[0].entityId, task.id);
});
