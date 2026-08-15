const DEFAULT_KEY = 'mahd_product_store_v1';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

/**
 * عقد التخزين الحالي:
 * - load() يعيد snapshot كاملة أو null.
 * - save(snapshot) يحفظ snapshot كاملة.
 * - clear() يحذف snapshot.
 *
 * التنفيذ الحالي متزامن لأن واجهة Pilot الحالية متزامنة.
 * يمكن استبداله لاحقًا بمحول مشترك/بعيد، وعندها يجب أن يضيف طبقة التطبيق
 * مزامنة async وversion/updatedAt أو ETag قبل اعتماد الكتابة المتزامنة بين الأعضاء.
 */
export function createLocalStorageAdapter({ storage = globalThis?.localStorage, key = DEFAULT_KEY, now = () => new Date().toISOString() } = {}) {
  return {
    kind: 'local',
    load() {
      if (!storage?.getItem) return null;
      try {
        return JSON.parse(storage.getItem(key) || 'null');
      } catch {
        return null;
      }
    },
    save(snapshot) {
      const next = { ...clone(snapshot), updatedAt: now() };
      storage?.setItem?.(key, JSON.stringify(next));
      return clone(next);
    },
    clear() {
      storage?.removeItem?.(key);
    },
  };
}

export function createMemoryStorageAdapter(initialSnapshot = null, { now = () => new Date().toISOString() } = {}) {
  let snapshot = clone(initialSnapshot);
  return {
    kind: 'memory',
    load() {
      return clone(snapshot);
    },
    save(next) {
      snapshot = { ...clone(next), updatedAt: now() };
      return clone(snapshot);
    },
    clear() {
      snapshot = null;
    },
  };
}

export const MAHD_STORAGE_CONTRACT = Object.freeze({
  methods: ['load', 'save', 'clear'],
  requiredSnapshotFields: ['version', 'clients', 'projects', 'tasks', 'deliverables', 'internalWorks', 'syncOperations', 'drafts', 'updatedAt'],
  currentKind: 'local',
  futureKind: 'shared',
});

export { DEFAULT_KEY as MAHD_STORAGE_KEY };
