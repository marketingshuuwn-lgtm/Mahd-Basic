import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  mapTrelloCardToTaskFields,
  trelloFetchMyOpenCards,
  trelloTestConnection,
} from '../lib/trello';
import { TRELLO_WORKSPACE_ID } from '../utils/taskMeta';

const PROVIDER = 'trello';
const DEFAULT_QUADRANT = 'important-not-urgent';

export function useTrello(showToast, onSynced) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [member, setMember] = useState(null);

  const loadConfig = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', PROVIDER)
        .maybeSingle();

      if (error) throw error;
      setConfig(data);
    } catch (err) {
      console.error(err);
      setConfig(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveCredentials = useCallback(
    async (apiKey, accessToken) => {
      const payload = {
        provider: PROVIDER,
        api_key: apiKey.trim(),
        access_token: accessToken.trim(),
        updated_at: new Date().toISOString(),
      };

      try {
        const me = await trelloTestConnection(payload.api_key, payload.access_token);
        setMember(me);

        const { data: existing, error: selectErr } = await supabase
          .from('integrations')
          .select('id')
          .eq('provider', PROVIDER)
          .maybeSingle();

        if (selectErr) {
          throw new Error(
            selectErr.message + ' — تأكد من وجود جدول integrations في Supabase.'
          );
        }

        let error;
        if (existing?.id) {
          ({ error } = await supabase.from('integrations').update(payload).eq('id', existing.id));
        } else {
          ({ error } = await supabase.from('integrations').insert(payload));
        }

        if (error) {
          throw new Error(error.message || 'تعذّر حفظ بيانات تريلو في قاعدة البيانات');
        }

        await loadConfig();
        showToast?.('تم الربط: ' + (me.fullName || me.username), 'ph-link');
        return me;
      } catch (err) {
        console.error(err);
        const msg = err?.message || 'فشل ربط تريلو';
        showToast?.(msg, 'ph-x-circle', 'error');
        throw err;
      }
    },
    [loadConfig, showToast]
  );

  const disconnect = useCallback(async () => {
    const { error } = await supabase.from('integrations').delete().eq('provider', PROVIDER);
    if (error) {
      showToast?.('تعذّر قطع الربط', 'ph-x-circle', 'error');
      return;
    }
    setConfig(null);
    setMember(null);
    showToast?.('تم قطع ربط تريلو', 'ph-link-break');
  }, [showToast]);

  /**
   * @param {{ silent?: boolean }} [opts]
   * silent: مزامنة خلفية بلا إشعار (الافتراضي للإقلاع التلقائي)
   */
  const syncNow = useCallback(
    async (opts = {}) => {
      const silent = opts.silent === true;

      if (!config?.api_key || !config?.access_token) {
        if (!silent) showToast?.('اربط حساب تريلو أولاً', 'ph-warning', 'error');
        return { created: 0, updated: 0, completed: 0 };
      }

      if (syncing) return { created: 0, updated: 0, completed: 0 };

      setSyncing(true);
      try {
        const cards = await trelloFetchMyOpenCards(config.api_key, config.access_token);

        const { data: existingRows, error: fetchErr } = await supabase
          .from('tasks')
          .select('id, external_id, quadrant, completed, status')
          .eq('external_source', 'trello');

        if (fetchErr) throw fetchErr;

        const byExternal = new Map((existingRows || []).map((r) => [r.external_id, r]));

        let created = 0;
        let updated = 0;
        let completedFromTrello = 0;
        const now = new Date().toISOString();

        for (const card of cards) {
          const fields = mapTrelloCardToTaskFields(card);
          const prev = byExternal.get(card.id);

          if (prev) {
            const { error } = await supabase
              .from('tasks')
              .update({
                title: fields.title,
                notes: fields.notes,
                due_date: fields.dueDate || null,
                context: TRELLO_WORKSPACE_ID,
                external_url: fields.external_url,
                external_meta: fields.external_meta,
                last_synced_at: now,
              })
              .eq('id', prev.id);
            if (error) console.error(error);
            else updated += 1;
            byExternal.delete(card.id);
          } else {
            const { error } = await supabase.from('tasks').insert({
              title: fields.title,
              notes: fields.notes,
              due_date: fields.dueDate || null,
              quadrant: DEFAULT_QUADRANT,
              context: TRELLO_WORKSPACE_ID,
              completed: false,
              status: 'not_started',
              duration: 1,
              sort_order: 0,
              external_source: 'trello',
              external_id: fields.external_id,
              external_url: fields.external_url,
              external_meta: fields.external_meta,
              last_synced_at: now,
            });
            if (error) console.error(error);
            else created += 1;
          }
        }

        for (const prev of byExternal.values()) {
          if (prev.completed) continue;
          const { error } = await supabase
            .from('tasks')
            .update({
              completed: true,
              status: 'completed',
              completed_at: now,
              context: TRELLO_WORKSPACE_ID,
              last_synced_at: now,
            })
            .eq('id', prev.id);
          if (error) console.error(error);
          else completedFromTrello += 1;
        }

        await supabase
          .from('integrations')
          .update({ last_sync_at: now, updated_at: now })
          .eq('provider', PROVIDER);

        // quiet: لا يقلب loading فيعيد تشغيل useEffect في App
        await loadConfig({ quiet: true });
        onSynced?.();

        // إشعار فقط عند حدث يهم المستخدم (جديد أو مكتمل) — وليس «0 جديدة، 23 محدّثة»
        if (!silent && (created > 0 || completedFromTrello > 0)) {
          const parts = [];
          if (created > 0) parts.push(created + ' جديدة');
          if (completedFromTrello > 0) parts.push(completedFromTrello + ' مكتملة من تريلو');
          showToast?.('مزامنة تريلو: ' + parts.join('، '), 'ph-arrows-clockwise');
        }

        return {
          created,
          updated,
          completed: completedFromTrello,
          total: cards.length,
        };
      } catch (err) {
        console.error(err);
        if (!silent) {
          showToast?.(err.message || 'فشلت المزامنة مع تريلو', 'ph-x-circle', 'error');
        }
        return { created: 0, updated: 0, completed: 0 };
      } finally {
        setSyncing(false);
      }
    },
    [config, loadConfig, onSynced, showToast, syncing]
  );

  return {
    config,
    loading,
    syncing,
    member,
    isConnected: !!(config?.api_key && config?.access_token),
    saveCredentials,
    disconnect,
    syncNow,
    reload: loadConfig,
  };
}
