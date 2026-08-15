import { useMemo, useState } from 'react';

const PROJECTS = [
  {
    id: 'thabat',
    client: 'ثبات',
    title: 'تقويم تحريري وخطة محتوى',
    service: 'إدارة المحتوى الشهري',
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
    service: 'هوية بصرية ولفظية',
    status: 'مرحلة الاكتشاف',
    progress: 24,
    due: 'التسليم القادم: اعتماد الموجز',
    risk: 'تحت المراجعة',
    team: ['مالك / مدير مشاريع', 'مدير حساب', 'كاتب محتوى', 'مصمم'],
  },
];

const CLIENTS = [
  {
    id: 'thabat',
    name: 'ثبات',
    context: 'استمرارية الرسائل والقنوات وخطة النشر الشهرية.',
    relationship: 'عميل نشط',
    projectId: 'thabat',
    project: 'تقويم تحريري وخطة محتوى',
    next: 'مراجعة التقويم',
  },
  {
    id: 'baraka',
    name: 'مزاد بركة',
    context: 'سياق العلامة وقرارات الاكتشاف والهوية الجديدة.',
    relationship: 'عميل نشط',
    projectId: 'baraka',
    project: 'استراتيجية العلامة',
    next: 'اعتماد موجز العلامة',
  },
];

const TASKS = [
  { id: 'thabat-calendar', title: 'مراجعة التقويم التحريري', client: 'ثبات', projectId: 'thabat', project: 'تقويم تحريري وخطة محتوى', owner: 'مدير الحساب', due: 'هذا الأسبوع', status: 'للمراجعة', tone: 'warning' },
  { id: 'thabat-copy', title: 'تحرير مسودات الأسبوع الأول', client: 'ثبات', projectId: 'thabat', project: 'تقويم تحريري وخطة محتوى', owner: 'كاتب المحتوى', due: 'بعد الاعتماد', status: 'قيد الإعداد', tone: 'neutral' },
  { id: 'baraka-brief', title: 'اعتماد موجز العلامة', client: 'مزاد بركة', projectId: 'baraka', project: 'استراتيجية العلامة', owner: 'مالك / مدير مشاريع', due: 'غدًا', status: 'بانتظار قرار', tone: 'warning' },
  { id: 'baraka-research', title: 'تلخيص مخرجات الاكتشاف', client: 'مزاد بركة', projectId: 'baraka', project: 'استراتيجية العلامة', owner: 'مدير الحساب', due: 'هذا الأسبوع', status: 'قيد التنفيذ', tone: 'success' },
];

const NAV = [
  { id: 'home', label: 'الرئيسية', icon: 'ph-house-simple' },
  { id: 'tasks', label: 'المهام', icon: 'ph-check-square' },
  { id: 'clients', label: 'العملاء', icon: 'ph-buildings' },
  { id: 'projects', label: 'المشاريع', icon: 'ph-briefcase' },
  { id: 'library', label: 'المكتبة والقوالب', icon: 'ph-books' },
  { id: 'my-work', label: 'عملي', icon: 'ph-check-square-offset' },
];

function PrototypePill({ children, tone = 'neutral' }) {
  return <span className={`agency-preview-pill ${tone}`}>{children}</span>;
}

function ScreenHeader({ eyebrow, title, description, action }) {
  return (
    <section className="agency-screen-header">
      <div>
        <span className="agency-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </section>
  );
}

function ProjectCard({ project, onOpen }) {
  return (
    <button type="button" className="agency-project-card" onClick={() => onOpen(project.id)}>
      <div className="agency-card-topline">
        <span className="agency-client-label"><i className="ph ph-buildings" /> {project.client}</span>
        <PrototypePill tone={project.risk === 'متوسط' ? 'warning' : 'neutral'}>{project.risk}</PrototypePill>
      </div>
      <strong>{project.title}</strong>
      <span className="agency-project-status">{project.status} · {project.service}</span>
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

function HomeView({ onOpenProject, onOpenProjects, onOpenTemplate }) {
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
        <article><span>عملاء نشطون</span><strong>2</strong><small>ثبات ومزاد بركة</small></article>
        <article><span>مشاريع نشطة</span><strong>2</strong><small>مشروع تجريبي لكل عميل</small></article>
        <article><span>تسليمات هذا الأسبوع</span><strong>3</strong><small>تحتاج اعتمادًا أو مراجعة</small></article>
        <article><span>إجراءات قابلة للقالب</span><strong>6</strong><small>هدف الأتمتة التدريجية</small></article>
      </section>

      <section className="agency-section">
        <div className="agency-section-heading"><div><span className="agency-eyebrow">المشاريع</span><h2>حالة العمل الآن</h2></div><button type="button" onClick={onOpenProjects}>فتح كل المشاريع <i className="ph ph-arrow-left" /></button></div>
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

function ClientsView({ onOpenProject }) {
  return (
    <div className="agency-preview-content">
      <ScreenHeader eyebrow="العلاقات" title="العملاء" description="هنا يبقى السياق المشترك للجهة المتعاقدة، ثم تنتقل منه إلى مشروع محدد ومخرجاته." />
      <section className="agency-client-grid">
        {CLIENTS.map((client) => (
          <article className="agency-client-card" key={client.id}>
            <div className="agency-card-topline"><span className="agency-client-avatar">{client.name.charAt(0)}</span><PrototypePill tone="success">{client.relationship}</PrototypePill></div>
            <h2>{client.name}</h2>
            <p>{client.context}</p>
            <div className="agency-client-metric"><span>المشروع النشط</span><strong>{client.project}</strong></div>
            <div className="agency-client-metric"><span>التسليم التالي</span><strong>{client.next}</strong></div>
            <button type="button" className="agency-secondary-btn" onClick={() => onOpenProject(client.projectId)}>فتح مشروع العميل <i className="ph ph-arrow-left" /></button>
          </article>
        ))}
      </section>
      <section className="agency-guidance-panel"><i className="ph ph-info" /><div><strong>ماذا تمثل هذه الشاشة؟</strong><p>العميل هو العلاقة والسياق المستمر. المشروع هو العمل المحدد الذي ننجزه لهذا العميل الآن.</p></div></section>
    </div>
  );
}

function ProjectsView({ onOpenProject }) {
  return (
    <div className="agency-preview-content">
      <ScreenHeader eyebrow="التنفيذ" title="المشاريع" description="كل مشروع له نطاق وحالة وفريق وتسليم تالٍ؛ افتح المشروع لرؤية المعرفة والتنفيذ معًا." />
      <section className="agency-project-grid agency-project-grid-wide">
        {PROJECTS.map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />)}
      </section>
      <section className="agency-guidance-panel"><i className="ph ph-briefcase" /><div><strong>في هذا النموذج</strong><p>ثبات لديه مشروع «تقويم تحريري وخطة محتوى»، ومزاد بركة لديه مشروع «استراتيجية العلامة». هذه خريطة Pilot ثابتة وليست بيانات مستوردة بعد.</p></div></section>
    </div>
  );
}

function TaskList({ tasks, onOpenProject, compact = false }) {
  return (
    <div className={`agency-task-list${compact ? ' compact' : ''}`}>
      {!compact && <div className="agency-task-table-head"><span>المهمة</span><span>السياق</span><span>المالك</span><span>التسليم</span><span>الحالة</span></div>}
      {tasks.map((task) => (
        <button type="button" className="agency-task-row" key={task.id} onClick={() => onOpenProject(task.projectId)}>
          <span className="agency-task-title"><i className="ph ph-check-circle" /><strong>{task.title}</strong></span>
          <span className="agency-task-context"><small>{task.client}</small><strong>{task.project}</strong></span>
          <span className="agency-task-owner">{task.owner}</span>
          <span className="agency-task-due">{task.due}</span>
          <PrototypePill tone={task.tone}>{task.status}</PrototypePill>
        </button>
      ))}
    </div>
  );
}

function TasksView({ onOpenProject }) {
  return (
    <div className="agency-preview-content">
      <ScreenHeader eyebrow="التنفيذ" title="المهام" description="هذه قائمة عمل الفريق، وكل صف يعرض العميل والمشروع الذي جاءت منه المهمة قبل الحالة والموعد." />
      <section className="agency-panel agency-task-panel"><div className="agency-panel-heading"><h2>مهام Pilot الحالية</h2><PrototypePill>بيانات نموذجية</PrototypePill></div><TaskList tasks={TASKS} onOpenProject={onOpenProject} /></section>
      <section className="agency-guidance-panel"><i className="ph ph-link-simple" /><div><strong>كل مهمة لها سياق</strong><p>افتح أي صف للانتقال إلى المشروع المرتبط به. ستتحول هذه البيانات إلى قراءة من Trello فقط في مرحلة جسر المطابقة.</p></div></section>
    </div>
  );
}

function MyWorkView({ onOpenProject, onOpenTasks }) {
  const personalTasks = TASKS.filter((task) => ['مالك / مدير مشاريع', 'مدير الحساب'].includes(task.owner));
  return (
    <div className="agency-preview-content">
      <ScreenHeader eyebrow="منظور شخصي" title="عملي" description="هذه ليست قائمة منفصلة؛ إنها ما يحتاجه الدور التجريبي إلى متابعته من داخل مشاريع الوكالة." action={<button type="button" className="agency-secondary-btn" onClick={onOpenTasks}>كل مهام الفريق <i className="ph ph-arrow-left" /></button>} />
      <section className="agency-summary-grid agency-summary-grid-three"><article><span>تحتاج قرارًا</span><strong>1</strong><small>اعتماد موجز مزاد بركة</small></article><article><span>هذا الأسبوع</span><strong>2</strong><small>مراجعة ومتابعة مشروعين</small></article><article><span>مواعيد قريبة</span><strong>1</strong><small>يحتاج تدخلًا اليوم</small></article></section>
      <section className="agency-panel agency-task-panel"><div className="agency-panel-heading"><h2>ما يحتاج متابعتك الآن</h2><PrototypePill tone="warning">نموذج دور</PrototypePill></div><TaskList tasks={personalTasks} onOpenProject={onOpenProject} compact /></section>
    </div>
  );
}

function ProjectView({ project, onBack, onOpenTemplates }) {
  const [tab, setTab] = useState('overview');
  const projectTasks = TASKS.filter((task) => task.projectId === project.id);
  const tabContent = useMemo(() => ({
    overview: <><div className="agency-project-overview-grid"><article><span>تقدم المشروع</span><strong>{project.progress}%</strong><div className="agency-progress-track"><span style={{ width: `${project.progress}%` }} /></div></article><article><span>التسليم التالي</span><strong>{project.due.replace('التسليم القادم: ', '')}</strong><small>ضمن سياق المشروع نفسه</small></article><article><span>الفريق</span><strong>{project.team.length} أدوار</strong><small>{project.team.join(' · ')}</small></article></div><section className="agency-panel agency-brief-panel"><div className="agency-panel-heading"><h2>ملخص المشروع</h2><PrototypePill>Page + Tasks</PrototypePill></div><p>يضم المشروع موجز العميل والقرارات والروابط والمخرجات، ثم يحول الإجراءات الواضحة إلى مهام مرتبطة به، لا إلى بطاقات بلا سياق.</p><button type="button" onClick={onOpenTemplates}><i className="ph ph-files" /> عرض قالب المشروع</button></section></>,
    work: <section className="agency-panel agency-task-panel"><div className="agency-panel-heading"><h2>مهام المشروع</h2><PrototypePill tone="warning">Table / Board / Calendar</PrototypePill></div><TaskList tasks={projectTasks} onOpenProject={() => {}} /></section>,
    pages: <section className="agency-panel"><div className="agency-panel-heading"><h2>صفحات المشروع</h2><PrototypePill tone="success">نموذج معرفة</PrototypePill></div><div className="agency-page-list"><button type="button"><i className="ph ph-file-text" /> موجز العميل <span>الصفحة الأساسية</span></button><button type="button"><i className="ph ph-users-three" /> محضر اجتماع الاكتشاف <span>3 إجراءات قابلة للتحويل</span></button><button type="button"><i className="ph ph-checklist" /> قائمة تسليم العميل <span>قيد الإعداد</span></button></div></section>,
    activity: <section className="agency-panel"><div className="agency-panel-heading"><h2>النشاط</h2><PrototypePill>سجل موحد</PrototypePill></div><p className="agency-empty-copy">سيجمع هذا التبويب قرارات الصفحة وتحديثات المهام والاعتمادات داخل سجل قابل للتدقيق عند بناء طبقة الفريق.</p></section>,
  })[tab], [onOpenTemplates, project, projectTasks, tab]);

  return (
    <div className="agency-preview-content">
      <button type="button" className="agency-back-btn" onClick={onBack}><i className="ph ph-arrow-right" /> العودة إلى المشاريع</button>
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
  const openSection = (id) => { setProjectId(null); setSection(id === 'library' ? 'templates' : id); };

  return (
    <div className="agency-preview-shell" dir="rtl">
      <header className="agency-preview-banner"><i className="ph ph-flask" /> نموذج تجربة المرحلة الأولى — بيانات توضيحية فقط، لا يقرأ أو يكتب Trello</header>
      <div className="agency-preview-frame">
        <aside className="agency-preview-nav" aria-label="التنقل التجريبي">
          <div className="agency-workspace-mark"><span>م</span><div><strong>وكالة مَهَد</strong><small>مساحة تجريبية</small></div></div>
          {NAV.map((item) => <button type="button" key={item.id} className={section === item.id || (item.id === 'library' && section === 'templates') ? 'active' : ''} onClick={() => openSection(item.id)}><i className={`ph ${item.icon}`} /> {item.label}</button>)}
          <div className="agency-nav-note"><i className="ph ph-info" /> هدف النموذج: اختبار السياق والتدفق قبل بناء البيانات أو الأتمتة.</div>
        </aside>
        <main className="agency-preview-main">
          {section === 'home' && <HomeView onOpenProject={openProject} onOpenProjects={() => openSection('projects')} onOpenTemplate={openTemplates} />}
          {section === 'clients' && <ClientsView onOpenProject={openProject} />}
          {section === 'projects' && <ProjectsView onOpenProject={openProject} />}
          {section === 'tasks' && <TasksView onOpenProject={openProject} />}
          {section === 'my-work' && <MyWorkView onOpenProject={openProject} onOpenTasks={() => openSection('tasks')} />}
          {section === 'project' && project && <ProjectView project={project} onBack={() => openSection('projects')} onOpenTemplates={openTemplates} />}
          {section === 'templates' && <TemplateView onBack={() => openSection('home')} />}
        </main>
      </div>
    </div>
  );
}
