import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function unavailableError() {
  return new Error('Supabase غير مهيأ في نسخة Trello-first. هذه الوظيفة مؤجلة حتى مشروع Supabase الجديد.');
}

/**
 * يبقي hooks الثانوية قابلة للتركيب عندما لا توجد قاعدة Supabase.
 * لا يخزن هذا العميل الوهمي أي بيانات ولا يخفي فشل عمليات الكتابة؛ بل يعيد خطأً متوقعًا
 * للمسارات التي لم تدخل نطاق Trello-first بعد.
 */
function createUnavailableQuery() {
  const result = { data: null, error: unavailableError() };
  let query;
  query = new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'then') return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
        if (key === 'catch') return (reject) => Promise.resolve(result).catch(reject);
        if (key === 'finally') return (callback) => Promise.resolve(result).finally(callback);
        return () => query;
      },
    }
  );
  return query;
}

function createUnavailableClient() {
  return {
    from: () => createUnavailableQuery(),
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
    }),
    removeChannel: () => undefined,
  };
}

if (!isConfigured) {
  console.info('[Mahd] وضع Trello-first مفعل: تكاملات Supabase الثانوية مؤجلة.');
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createUnavailableClient();

export const isSupabaseConfigured = isConfigured;
