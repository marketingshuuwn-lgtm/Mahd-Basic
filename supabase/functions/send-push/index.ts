/**
 * Edge Function: send-push
 * يرسل Web Push لكل الاشتراكات في push_subscriptions.
 *
 * CORS: المتصفح يرسل OPTIONS قبل POST — بدون هذا الرد يفشل الإشعار التجريبي.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Preflight — إصلاح CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: secrets, error: secretsErr } = await supabase
      .from('app_secrets')
      .select('key, value')
      .in('key', ['vapid_public_key', 'vapid_private_key', 'vapid_subject']);

    if (secretsErr) throw secretsErr;

    const secretMap = Object.fromEntries((secrets || []).map((s) => [s.key, s.value]));
    const publicKey = secretMap.vapid_public_key;
    const privateKey = secretMap.vapid_private_key;
    const subject = secretMap.vapid_subject || 'mailto:admin@mahd.app';

    if (!publicKey || !privateKey) {
      return jsonResponse({ error: 'VAPID keys missing in app_secrets' }, 500);
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    let payload: {
      type?: string;
      title?: string;
      body?: string;
    } = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const title = payload.title || 'مهد';
    const body =
      payload.body ||
      (payload.type === 'morning'
        ? 'ملخص مهام اليوم'
        : payload.type === 'evening'
          ? 'مراجعة مهام اليوم والمتأخر'
          : 'إشعار من مهد');

    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth');

    if (subsErr) throw subsErr;

    const list = subs || [];
    let sent = 0;
    const errors: string[] = [];

    for (const sub of list) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({ title, body, type: payload.type || 'custom' })
        );
        sent += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
        // اشتراك منتهٍ — احذفه
        if (msg.includes('410') || msg.includes('404')) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    return jsonResponse({ sent, total: list.length, errors: errors.slice(0, 5) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    return jsonResponse({ error: message }, 500);
  }
});
