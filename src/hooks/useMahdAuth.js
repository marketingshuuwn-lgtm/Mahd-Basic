import { useCallback, useEffect, useMemo, useState } from 'react';
import { mahdApi } from '../lib/mahdApi';

const ACTIVE_WORKSPACE_KEY = 'mahd_active_workspace_id';

export function useMahdAuth() {
  const [state, setState] = useState({ status: 'loading', user: null, workspaces: [], activeWorkspaceId: null, error: null });

  const load = useCallback(async () => {
    try {
      const [{ user }, { workspaces }] = await Promise.all([mahdApi.me(), mahdApi.workspaces()]);
      const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const activeWorkspaceId = workspaces.some((item) => item.id === saved) ? saved : workspaces[0]?.id || null;
      if (activeWorkspaceId) localStorage.setItem(ACTIVE_WORKSPACE_KEY, activeWorkspaceId);
      setState({ status: 'authenticated', user, workspaces, activeWorkspaceId, error: null });
    } catch (error) {
      if (error.status === 401) setState({ status: 'anonymous', user: null, workspaces: [], activeWorkspaceId: null, error: null });
      else setState((current) => ({ ...current, status: 'error', error: error.message }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectWorkspace = useCallback((workspaceId) => {
    setState((current) => {
      if (!current.workspaces.some((item) => item.id === workspaceId)) return current;
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
      return { ...current, activeWorkspaceId: workspaceId };
    });
  }, []);

  const authenticate = useCallback(async (mode, body) => {
    setState((current) => ({ ...current, status: 'submitting', error: null }));
    try {
      await (mode === 'register' ? mahdApi.register(body) : mahdApi.login(body));
      await load();
    } catch (error) {
      setState((current) => ({ ...current, status: 'anonymous', error: error.message }));
      throw error;
    }
  }, [load]);

  const createWorkspace = useCallback(async (body) => {
    const result = await mahdApi.createWorkspace(body);
    await load();
    selectWorkspace(result.workspace.id);
    return result;
  }, [load, selectWorkspace]);

  const logout = useCallback(async () => {
    await mahdApi.logout().catch(() => {});
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    setState({ status: 'anonymous', user: null, workspaces: [], activeWorkspaceId: null, error: null });
  }, []);

  return useMemo(() => ({ ...state, refresh: load, selectWorkspace, authenticate, createWorkspace, logout, activeWorkspace: state.workspaces.find((item) => item.id === state.activeWorkspaceId) || null }), [state, load, selectWorkspace, authenticate, createWorkspace, logout]);
}
