import { useState } from 'react';

function AuthForm({ auth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try { await auth.authenticate(mode, form); } catch { /* تعرض الرسالة داخل البطاقة */ } finally { setBusy(false); }
  };
  return <div className="mahd-auth-card"><span className="mahd-auth-eyebrow">منصة مَهَد</span><h1>{mode === 'login' ? 'تسجيل الدخول إلى مساحة الوكالة' : 'إنشاء حساب مَهَد'}</h1><p>تبدأ صلاحياتك من جلسة حقيقية وعضوية Workspace، وليس من نمط عرض محلي.</p><form onSubmit={submit}>{mode === 'register' && <label>الاسم<input required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></label>}<label>البريد الإلكتروني<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>كلمة المرور<input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>{auth.error && <div className="mahd-auth-error">{auth.error}</div>}<button className="mahd-auth-submit" disabled={busy}>{busy ? 'جارٍ التحقق…' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}</button></form><button type="button" className="mahd-auth-link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); auth.refresh(); }}>{mode === 'login' ? 'ليس لديك حساب؟ إنشاء حساب' : 'لديك حساب؟ تسجيل الدخول'}</button></div>;
}

function WorkspaceForm({ auth }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => { event.preventDefault(); setBusy(true); try { await auth.createWorkspace({ name }); } catch (error) { /* يعرض الخطأ لاحقًا عند توصيل toast */ } finally { setBusy(false); } };
  return <div className="mahd-auth-card"><span className="mahd-auth-eyebrow">مرحبًا {auth.user?.displayName || auth.user?.email}</span><h1>أنشئ مساحة عملك الأولى</h1><p>المساحة هي حدود بيانات الوكالة والعضويات والصلاحيات.</p><form onSubmit={submit}><label>اسم مساحة العمل<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="وكالة مَهَد" /></label><button className="mahd-auth-submit" disabled={busy}>{busy ? 'جارٍ الإنشاء…' : 'إنشاء مساحة العمل'}</button></form><button type="button" className="mahd-auth-link" onClick={auth.logout}>تسجيل الخروج</button></div>;
}

export default function MahdAuthGate({ auth, children }) {
  if (auth.status === 'loading' || auth.status === 'submitting') return <div className="mahd-auth-shell"><div className="mahd-auth-card"><h1>جارٍ تحميل جلسة مَهَد…</h1></div></div>;
  if (auth.status === 'error') return <div className="mahd-auth-shell"><div className="mahd-auth-card"><h1>تعذر الاتصال بـ Backend</h1><p>{auth.error}</p><button className="mahd-auth-submit" onClick={auth.refresh}>إعادة المحاولة</button></div></div>;
  if (auth.status === 'anonymous') return <div className="mahd-auth-shell"><AuthForm auth={auth} /></div>;
  if (!auth.activeWorkspaceId) return <div className="mahd-auth-shell"><WorkspaceForm auth={auth} /></div>;
  return children;
}
