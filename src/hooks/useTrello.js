import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  mapTrelloCardToTaskFields,
  trelloFetchMyOpenCards,
  trelloTestConnection,
} from '../lib/trello';

const PROVIDER = 'trello';
const DEFAULT_QUADRANT = 'important-not-urgent';

export function useTrello(showToast, onSynced) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [member, setMember] = useState(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', PROVIDER)
      .maybeSingle();

    if (error) {
      console.error(error);
      // الجدول قد لا يكون موجوداً بعد
      setConfig(null);
    } else {
      setConfig(data);
    }
    setLoading(false);
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

      // اختبار قبل الحفظ
      const me = await trelloTestConnection(payload.api_key, payload.access_token);
      setMember(me);

      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('provider', PROVIDER)
        .maybeSingle();

      let error;
      if (existing?.id) {
        ({ error } = await supabase.from('integrations').update(payload).eq('id', existing.id));
      } else {
        ({ error } = await supabase.from('integrations').insert(payload));
      }

      if (error) {
        console.error(error);
        throw new Error(error.message || 'تعذّر حفظ بيانات تريلو');
      }

      await loadConfig();
      showToast?.(`تم الربط: ${me.fullName || me.username}`, 'ph-link');
      return me;
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

  const syncNow = useCallback(async () => {
    if (!config?.api_key || !config?.access_token) {
      showToast?.('اربط حساب تريلو أولاً', 'ph-warning', 'error');
      return { created: 0, updated: 0 };
    }

    setSyncing(true);
    try {
      const cards = await trelloFetchMyOpenCards(config.api_key, config.access_token);

      // المهام المرتبطة بتريلو حالياً
      const { data: existingRows, error: fetchErr } = await supabase
        .from('tasks')
        .select('id, external_id, quadrant, completed')
        .eq('external_source', 'trello');

      if (fetchErr) throw fetchErr;

      const byExternal = new Map(
        (existingRows || []).map((r) => [r.external_id, r])
      );

      let created = 0;
      let updated = 0;
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
              external_url: fields.external_url,
              external_meta: fields.external_meta,
              last_synced_at: now,
              // لا نغيّر quadrant أو completed التي ضبطها المستخدم في مهد
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
            context: 'work',
            completed: false,
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

      await supabase
        .from('integrations')
        .update({ last_sync_at: now, updated_at: now })
        .eq('provider', PROVIDER);

      await loadConfig();
      onSynced?.();

      showToast?.(
        `مزامنة تريلو: ${created} جديدة، ${updated} محدّثة`,
        'ph-arrows-clockwise'
      );
      return { created, updated, total: cards.length };
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'فشلت المزامنة مع تريلو', 'ph-x-circle', 'error');
      return { created: 0, updated: 0 };
    } finally {
      setSyncing(false);
    }
  }, [config, loadConfig, onSynced, showToast]);

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
