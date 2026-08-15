const DEFAULT_KEY = 'mahd_product_store_v1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function emptyState() {
  return { version: 1, clients: [], projects: [], tasks: [], syncOperations: [], drafts: [], updatedAt: null };
}

function normalizeState(value) {
  const base = emptyState();
  const next = value && typeof value === 'object' ? value : {};
  return {
    ...base,
    ...next,
    clients: Array.isArray(next.clients) ? next.clients : [],
    projects: Array.isArray(next.projects) ? next.projects : [],
    tasks: Array.isArray(next.tasks) ? next.tasks : [],
    syncOperations: Array.isArray(next.syncOperations) ? next.syncOperations : [],
    drafts: Array.isArray(next.drafts) ? next.drafts : [],
  };
}

export function createMahdRepository({ storage = globalThis?.localStorage, key = DEFAULT_KEY, now = () => new Date().toISOString() } = {}) {
  const read = () => {
    if (!storage?.getItem) return emptyState();
    try {
      return normalizeState(JSON.parse(storage.getItem(key) || 'null'));
    } catch {
      return emptyState();
    }
  };
  const write = (state) => {
    const next = { ...normalizeState(state), updatedAt: now() };
    storage?.setItem?.(key, JSON.stringify(next));
    return clone(next);
  };
  const upsert = (collection, record) => {
    if (!record?.id) throw new Error('السجل يحتاج معرّفًا قبل الحفظ.');
    const state = read();
    const items = state[collection];
    const index = items.findIndex((item) => item.id === record.id);
    if (index === -1) items.push(clone(record));
    else items[index] = clone(record);
    return write(state);
  };

  return {
    load() {
      return clone(read());
    },
    saveClient(client) { return upsert('clients', client); },
    saveProject(project) { return upsert('projects', project); },
    saveTask(task) { return upsert('tasks', task); },
    saveSyncOperation(operation) { return upsert('syncOperations', operation); },
    saveDraft(draft) { return upsert('drafts', draft); },
    getDraft(id) { return read().drafts.find((draft) => draft.id === id) || null; },
    listDrafts() { return clone(read().drafts); },
    clear() { return write(emptyState()); },
  };
}

export { DEFAULT_KEY as MAHD_REPOSITORY_KEY };
