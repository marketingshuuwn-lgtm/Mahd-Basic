import test from 'node:test';
import assert from 'node:assert/strict';
import { createMahdRepository } from './mahdRepository.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, value); },
  };
}

test('يحفظ المستودع الداخلي الكيانات ويستعيدها بعد إنشاء نسخة جديدة', () => {
  const storage = memoryStorage();
  const first = createMahdRepository({ storage, now: () => '2026-08-15T00:00:00.000Z' });
  first.saveClient({ id: 'client-1', name: 'مستر آرت' });
  first.saveProject({ id: 'project-1', clientId: 'client-1', name: 'التأسيس' });
  first.saveTask({ id: 'task-1', clientId: 'client-1', projectId: 'project-1', title: 'استراتيجية العلامة' });

  const restored = createMahdRepository({ storage });
  const state = restored.load();
  assert.equal(state.clients[0].name, 'مستر آرت');
  assert.equal(state.projects[0].clientId, 'client-1');
  assert.equal(state.tasks[0].projectId, 'project-1');
});

test('يحدث السجل نفسه بدل إنشاء نسخة مكررة', () => {
  const storage = memoryStorage();
  const repository = createMahdRepository({ storage });
  repository.saveDraft({ id: 'draft-1', title: 'قبل', syncStatus: 'local_only' });
  repository.saveDraft({ id: 'draft-1', title: 'بعد', syncStatus: 'pending_approval' });
  const drafts = repository.listDrafts();
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].title, 'بعد');
  assert.equal(drafts[0].syncStatus, 'pending_approval');
});

test('يتعامل مع تخزين تالف بالعودة إلى حالة فارغة', () => {
  const storage = memoryStorage();
  storage.setItem('mahd_product_store_v1', '{not-json');
  const repository = createMahdRepository({ storage });
  assert.deepEqual(repository.load().clients, []);
  assert.deepEqual(repository.load().syncOperations, []);
});
