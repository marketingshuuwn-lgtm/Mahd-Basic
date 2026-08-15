import { useMemo, useState } from 'react';

const PROJECTS = [
  {
    id: 'thabat',
    client: 'ثبات',
    title: 'تقويم تحريري وخطة محتوى',
    status: 'قيد التنفيذ',
    progress: 58,
    due: 'التسليم القادم: مراجعة التقويم',
    risk: 'متوسط',
    team: ['مدير حساب', 'كاتب محتوى', 'مصمم', 'مسؤول ميديا'],
  },
  {
    id: 'baraka',
    client: 'مزاد بركة',
    title: 'استراتيجية العلامة',
    status: 'مرحلة الاكتشاف',
    progress: 24,
    due: 'التسليم القادم: اعتماد الموجز',
    risk: 'تحت المراجعة',
    team: ['مالك / مدير مشاريع', 'مدير حساب', 'كاتب محتوى', 'مصمم'],
  },
];

const NAV = [
  { id: 'home', label: 'الرئيسية', icon: 'ph-house-simple' },
  { id: 'clients', label: 'العملاء', icon: 'ph-buildings' },
  { id: 'projects', label: 'المشاريع', icon: 'ph-briefcase' },
  { id: 'library', label: 'المكتبة والقوالب', icon: 'ph-books' },
  { id: 'my-work', label: 'عملي', icon: 'ph-check-square-offset' },
];

function PrototypePill({ children, tone = 'neutral' }) {
  return <span className={`agency-preview-pill ${tone}`}>{children}</span>;
}

function ProjectCard({ project, onOpen }) {
  return (
    <button type="button" className="agency-project-card" onClick={() => onOpen(project.id)}>
      <div className="agency-card-topline">
        <span className="agency-client-label"><i className="ph ph-buildings" /> {project.client}</span>
        <PrototypePill tone={project.risk === 'متوسط' ? 'warning' : 'neutral'}>{project.risk}</PrototypePill>
      </div>
      <strong>{project.title}</strong>
      <span className="agency-project-status">{project.status}</span>
      <div className="agency-progress-track" aria-label={`نسبة الإنجاز ${project.progress}%`}>
        <span style={{ width: `${project.progress}%` }} />
      </div>
      <div className="agency-card-bottomline">
        <span>{project.progress}% منجز</span>
        <span>{project.due}</span>
      </div>
    </button>
  );
}

function HomeView({ onOpenProject, onOpenTemplate }) {
  return (
    <div className="agency-preview-content">
      <section className="agency-hero">
        <div>
          <span className="agency-eyebrow">مساحة الوكالة</span>
          <h1>العمل من السياق إلى التسليم</h1>
          <p>نموذج تجربة لمدير حساب يرى العملاء والمشاريع والتسليمات، لا قائمة مهام شخصية معزولة.</p>
        </div>
        <button type="button" className="agency-primary-btn" onClick={onOpenTemplate}>
          <i className="ph ph-plus-circle" /> مشروع من قالب
        </button>
      </section>

      <section className="agency-summary-grid" aria-label="ملخص نموذج الوكالة">
        <article><span>مشاريع نشطة</span><strong>2</strong><small>ثبات ومزاد بركة</small></article>
        <article><span>تسليمات هذا الأسبوع</span><strong>3</strong><small>تحتاج اعتمادًا أو مراجعة</small></article>
        <article><span>قرارات بانتظار تحويل</span><strong>4</strong><small>من محاضر واجتماعات</small></article>
        <article><span>إجراءات متكررة قابلة للقالب</span><strong>6</strong><small>هدف الأتمتة التدريجية</small></article>
      </section>

      <section className="agency-section">
        <div className="agency-section-heading"><div><span className="agency-eyebrow">المشاريع</span><h2>حالة العمل الآن</h2></div><button type="button" onClick={() => onOpenProject('thabat')}>فتح كل المشاريع <i className="ph ph-arrow-left" /></button></div>
        <div className="agency-project-grid">
          {PROJECTS.map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />)}
        </div>
      </section>

      <section className="agency-two-column">
        <article className="agency-panel">
          <div className="agency-panel-heading"><h2>تحديثات تحتاج قرارًا</h2><PrototypePill tone="warning">نموذج</PrototypePill></div>
          <button type="button" onClick={() => onOpenProject('baraka')}><i className="ph ph-note-pencil" /><span><strong>اعتماد موجز مزاد بركة</strong><small>لتحويل قرارات الاكتشاف إلى خطة مشروع</small></span><i className="ph ph-caret-left" /></button>
          <button type="button" onClick={() => onOpenProject('thabat')}><i className="ph ph-calendar-check" /><span><strong>مراجعة تقويم ثبات التحريري</strong><small>قبل انتقال عناصر المحتوى إلى الإنتاج</small></span><i className="ph ph-caret-left" /></button>
        </article>
        <article className="agency-panel">
          <div className="agency-panel-heading"><h2>من المعرفة إلى التنفيذ</h2><PrototypePill tone="success">المسار المقصود</PrototypePill></div>
          <ol className="agency-flow-list"><li><span>1</span> صفحة موجز أو محضر اجتماع</li><li><span>2</span> قرار أو إجراء واضح داخل الصفحة</li><li><span>3</span> مهمة مرتبطة بمالك وموعد</li><li><span>4</span> مخرج معتمد للعميل</li></ol>
        </article>
      </section>
    </div>
  );
}

function ProjectView({ project, onBack, onOpenTemplates }) {
  const [tab, setTab] = useState('overview');
  const tabContent = useMemo(() => ({
    overview: <><div className="agency-project-overview-grid"><article><span>تقدم المشروع</span><strong>{project.progress}%</strong><div className="agency-progress-track"><span style={{ width: `${project.progress}%` }} /></div></article><article><span>التسليم التالي</span><strong>{project.due.replace('التسليم القادم: ', '')}</strong><small>ضمن سياق المشروع نفسه</small></article><article><span>الفريق</span><strong>{project.team.length} أدوار</strong><small>{project.team.join(' · ')}</small></article></div><section className="agency-panel agency-brief-panel"><div className="agency-panel-heading"><h2>ملخص المشروع</h2><PrototypePill>Page + Tasks</PrototypePill></div><p>هنا تبدأ تجربة مَهَد المقصودة: موجز العميل، القرارات، الروابط والمخرجات داخل صفحة واحدة؛ وتتحول إجراءات محددة إلى مهام مرتبطة بها، لا إلى بطاقات بلا سياق.</p><button type="button" onClick={onOpenTemplates}><i className="ph ph-files" /> عرض قالب المشروع</button></section></>,
    work: <section className="agency-panel"><div className="agency-panel-heading"><h2>مهام المشروع</h2><PrototypePill tone="warning">Table / Board / Calendar</PrototypePill></div><div className="agency-work-sample"><span>مرحلة العمل</span><span>المالك</span><span>التسليم</span><span>الحالة</span><strong>مراجعة الموجز</strong><span>مدير الحساب</span><span>هذا الأسبوع</span><PrototypePill tone="warning">للمراجعة</PrototypePill><strong>إنتاج المخرج التالي</strong><span>الفريق المختص</span><span>بعد الاعتماد</span><PrototypePill>بانتظار القرار</PrototypePill></div></section>,
    pages: <section className="agency-panel"><div className="agency-panel-heading"><h2>صفحات المشروع</h2><PrototypePill tone="success">Blocks</PrototypePill></div><div className="agency-page-list"><button type="button"><i className="ph ph-file-text" /> موجز العميل <span>الصفحة الأساسية</span></button><button type="button"><i className="ph ph-users-three" /> محضر اجتماع الاكتشاف <span>3 إجراءات قابلة للتحويل</span></button><button type="button"><i className="ph ph-checklist" /> قائمة تسليم العميل <span>قيد الإعداد</span></button></div></section>,
    activity: <section className="agency-panel"><div className="agency-panel-heading"><h2>النشاط</h2><PrototypePill>سجل موحد</PrototypePill></div><p className="agency-empty-copy">سيجمع هذا التبويب قرارات الصفحة وتحديثات المهام والاعتمادات داخل سجل قابل للتدقيق عند بناء طبقة الفريق.</p></section>,
  })[tab], [onOpenTemplates, project, tab]);

  return (
    <div className="agency-preview-content">
      <button type="button" className="agency-back-btn" onClick={onBack}><i className="ph ph-arrow-right" /> العودة إلى مساحة الوكالة</button>
      <section className="agency-project-header">
        <div><span className="agency-eyebrow"><i className="ph ph-buildings" /> {project.client}</span><h1>{project.title}</h1><p>{project.status} · {project.due}</p></div>
        <button type="button" className="agency-secondary-btn" onClick={onOpenTemplates}><i className="ph ph-copy" /> استخدام قالب</button>
      </section>
      <nav className="agency-project-tabs" aria-label="أقسام المشروع">
        {[['overview', 'نظرة عامة'], ['work', 'التنفيذ'], ['pages', 'الصفحات'], ['activity', 'النشاط']].map(([id, label]) => <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {tabContent}
    </div>
  );
}

function TemplateView({ onBack }) {
  return (
    <div className="agency-preview-content">
      <button type="button" className="agency-back-btn" onClick={onBack}><i className="ph ph-arrow-right" /> العودة</button>
      <section className="agency-hero compact"><div><span className="agency-eyebrow">المكتبة والقوالب</span><h1>ابدأ من طريقة عمل الوكالة</h1><p>هذه القوالب تمثل السلوك المستهدف، وليست نماذج بيانات أو أتمتة منفذة بعد.</p></div></section>
      <div className="agency-template-grid">
        {[
          ['براند استراتيجي', 'Brief + اكتشاف + هوية لفظية وبصرية + مراجعة + تسليم', 'ph-sparkle'],
          ['تقويم محتوى شهري', 'استراتيجية + تقويم + إنتاج + مراجعة + نشر', 'ph-calendar-dots'],
          ['حملة ترويجية', 'هدف + مخرج إعلاني + إطلاق + متابعة + تقرير', 'ph-rocket-launch'],
        ].map(([title, desc, icon]) => <article key={title}><i className={`ph ${icon}`} /><h2>{title}</h2><p>{desc}</p><button type="button">معاينة التدفق <i className="ph ph-arrow-left" /></button></article>)}
      </div>
    </div>
  );
}

export default function AgencyWorkspacePreview() {
  const [section, setSection] = useState('home');
  const [projectId, setProjectId] = useState(null);
  const project = PROJECTS.find((item) => item.id === projectId);

  const openProject = (id) => { setProjectId(id); setSection('project'); };
  const openTemplates = () => { setProjectId(null); setSection('templates'); };

  return (
    <div className="agency-preview-shell" dir="rtl">
      <header className="agency-preview-banner"><i className="ph ph-flask" /> نموذج تجربة المرحلة الأولى — لا يقرأ أو يكتب بيانات Trello</header>
      <div className="agency-preview-frame">
        <aside className="agency-preview-nav" aria-label="التنقل التجريبي">
          <div className="agency-workspace-mark"><span>م</span><div><strong>وكالة مَهَد</strong><small>مساحة تجريبية</small></div></div>
          {NAV.map((item) => <button type="button" key={item.id} className={section === item.id ? 'active' : ''} onClick={() => { setProjectId(null); setSection(item.id === 'library' ? 'templates' : item.id); }}><i className={`ph ${item.icon}`} /> {item.label}</button>)}
          <div className="agency-nav-note"><i className="ph ph-info" /> هدف النموذج: اختبار السياق والتدفق قبل بناء البيانات أو الأتمتة.</div>
        </aside>
        <main className="agency-preview-main">
          {section === 'home' && <HomeView onOpenProject={openProject} onOpenTemplate={openTemplates} />}
          {section === 'project' && project && <ProjectView project={project} onBack={() => setSection('home')} onOpenTemplates={openTemplates} />}
          {section === 'templates' && <TemplateView onBack={() => setSection('home')} />}
          {['clients', 'projects', 'my-work'].includes(section) && <section className="agency-preview-content"><span className="agency-eyebrow">نموذج واجهة</span><h1>{NAV.find((item) => item.id === section)?.label}</h1><div className="agency-panel"><h2>هذه الوجهة ستبنى بعد اختبار المسارات الأساسية</h2><p className="agency-empty-copy">نختبر أولًا كيفية انتقال الفريق بين العميل والمشروع والصفحة والمهمة. لن نملأ هذه الشاشة ببيانات أو أزرار لا تمتلك نموذجًا تشغيليًا ثابتًا بعد.</p><button type="button" className="agency-primary-btn" onClick={() => setSection('home')}>العودة إلى المساحة التجريبية</button></div></section>}
        </main>
      </div>
    </div>
  );
}
