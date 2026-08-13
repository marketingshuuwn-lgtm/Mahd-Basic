import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { trelloFetchBoardLists, trelloFetchMyBoards, trelloTestConnection } from '../lib/trello';

const CONNECTION_KEY = 'mahd_trello_connection_v2';

function readConnection() {
  try {
    const raw = localStorage.getItem(CONNECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.apiKey || !parsed?.accessToken) return null;
    return {
      apiKey: String(parsed.apiKey),
      accessToken: String(parsed.accessToken),
      boardId: parsed.boardId ? String(parsed.boardId) : null,
      boardName: parsed.boardName ? String(parsed.boardName) : null,
      defaultListId: parsed.defaultListId ? String(parsed.defaultListId) : null,
      lastSyncAt: parsed.lastSyncAt || null,
    };
  } catch {
    return null;
  }
}

function writeConnection(connection) {
  localStorage.setItem(CONNECTION_KEY, JSON.stringify(connection));
}

function clearConnection() {
  localStorage.removeItem(CONNECTION_KEY);
}

export function useTrello(showToast) {
  const [config, setConfig] = useState(() => readConnection());
  const [member, setMember] = useState(null);
  const [boards, setBoards] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [revision, setRevision] = useState(0);
  const didBootstrap = useRef(false);

  const persist = useCallback((next) => {
    setConfig(next);
    writeConnection(next);
    return next;
  }, []);

  const loadBoards = useCallback(async (connection) => {
    if (!connection?.apiKey || !connection?.accessToken) {
      setBoards([]);
      return [];
    }
    const nextBoards = await trelloFetchMyBoards(connection.apiKey, connection.accessToken);
    setBoards(nextBoards || []);
    return nextBoards || [];
  }, []);

  const loadLists = useCallback(async (boardId, connection) => {
    if (!connection?.apiKey || !connection?.accessToken || !boardId) {
      setLists([]);
      return [];
    }
    const nextLists = await trelloFetchBoardLists(connection.apiKey, connection.accessToken, boardId);
    setLists(nextLists || []);
    return nextLists || [];
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const saved = readConnection();
      setConfig(saved);
      if (!saved) {
        setMember(null);
        setBoards([]);
        setLists([]);
        return null;
      }
      const [me, nextBoards] = await Promise.all([
        trelloTestConnection(saved.apiKey, saved.accessToken),
        loadBoards(saved),
      ]);
      setMember(me);
      if (saved.boardId) await loadLists(saved.boardId, saved);
      return { me, boards: nextBoards };
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'تعذّر تحميل اتصال تريلو', 'ph-x-circle', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadBoards, loadLists, showToast]);

  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    reload();
  }, [reload]);

  const saveCredentials = useCallback(
    async (apiKey, accessToken) => {
      const key = apiKey.trim();
      const token = accessToken.trim();
      const me = await trelloTestConnection(key, token);
      const next = {
        apiKey: key,
        accessToken: token,
        boardId: null,
        boardName: null,
        defaultListId: null,
        lastSyncAt: null,
      };
      persist(next);
      setMember(me);
      const nextBoards = await loadBoards(next);
      setLists([]);
      showToast?.(`تم التحقق من حساب ${me.fullName || me.username}. اختر Board للبدء.`, 'ph-link');
      return { member: me, boards: nextBoards };
    },
    [loadBoards, persist, showToast]
  );

  const selectBoard = useCallback(
    async (boardId) => {
      if (!config) throw new Error('اربط حساب تريلو أولاً.');
      const board = boards.find((item) => item.id === boardId);
      if (!board) throw new Error('لم يتم العثور على الـ Board المختار. حدّث القائمة وحاول مرة أخرى.');
      const nextLists = await loadLists(boardId, config);
      const next = persist({
        ...config,
        boardId,
        boardName: board.name,
        defaultListId: nextLists[0]?.id || null,
        lastSyncAt: new Date().toISOString(),
      });
      setRevision((value) => value + 1);
      showToast?.(`تم اختيار مساحة تريلو «${board.name}»`, 'ph-kanban');
      return next;
    },
    [boards, config, loadLists, persist, showToast]
  );

  const setDefaultList = useCallback(
    (listId) => {
      if (!config) return;
      persist({ ...config, defaultListId: listId || null });
    },
    [config, persist]
  );

  const syncNow = useCallback(async () => {
    if (!config?.boardId) {
      showToast?.('اختر Board من تريلو أولاً', 'ph-warning', 'error');
      return false;
    }
    setSyncing(true);
    try {
      await loadLists(config.boardId, config);
      const next = persist({ ...config, lastSyncAt: new Date().toISOString() });
      setRevision((value) => value + 1);
      showToast?.(`تم تحديث مهام «${next.boardName || 'Trello'}»`, 'ph-arrows-clockwise');
      return true;
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'فشلت مزامنة تريلو', 'ph-x-circle', 'error');
      return false;
    } finally {
      setSyncing(false);
    }
  }, [config, loadLists, persist, showToast]);

  const disconnect = useCallback(() => {
    clearConnection();
    setConfig(null);
    setMember(null);
    setBoards([]);
    setLists([]);
    setRevision((value) => value + 1);
    showToast?.('تم قطع ربط تريلو من هذا المتصفح', 'ph-link-break');
  }, [showToast]);

  const isConnected = Boolean(config?.apiKey && config?.accessToken);
  const isBoardSelected = Boolean(isConnected && config?.boardId);
  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === config?.boardId) || null,
    [boards, config?.boardId]
  );

  return {
    config,
    member,
    boards,
    lists,
    selectedBoard,
    loading,
    syncing,
    revision,
    isConnected,
    isBoardSelected,
    saveCredentials,
    selectBoard,
    setDefaultList,
    disconnect,
    syncNow,
    reload,
  };
}
