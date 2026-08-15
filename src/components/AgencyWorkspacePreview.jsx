import { useMemo, useState } from 'react';
import { createClient, createProject, createTask, createSyncOperation } from '../domain/mahdModel';
import { createMahdRepository } from '../domain/mahdRepository';
import { buildInboundChangeProposal, buildTrelloWritePlan, executeApprovedTrelloWrite } from '../lib/trelloSyncAdapter';
import { trelloFetchBoardCards } from '../lib/trello';
import trelloReadSnapshot from '../data/trelloReadSnapshot';
import { buildAgencyOperationalView } from '../utils/agencyOperationalView';
import { PILOT_BOARD_ID, PILOT_BOARD_SHORT_LINK } from '../utils/trelloPilotMatching';

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
    trelloCards: 26,
  },
  {
    id: 'baraka-auction',
    name: 'مزاد بركة',
    context: 'سياق العلامة وقرارات الاكتشاف والهوية الجديدة.',
    relationship: 'عميل نشط',
    projectId: 'baraka',
    project: 'استراتيجية العلامة',
    next: 'اعتماد موجز العلامة',
    trelloCards: 33,
  },
  {
    id: 'sanam',
    name: 'سنام',
    context: 'بطاقات العميل ظاهرة في قراءة Trello، لكن لم يعتمد لها مشروع محدد في مَهَد بعد.',
    relationship: 'يحتاج تعيين مشروع',
    projectId: null,
    project: 'لم يحدد مشروع بعد',
    next: 'تعيين مشروع للبطاقات الحالية',
    trelloCards: 6,
  },
  {
    id: 'marketing-brand',
    name: 'علامة تسويق',
    context: 'بطاقات العميل موجودة في Trello وتنتظر ربطًا صريحًا بمشروع قبل عرضها داخل مشروع.',
    relationship: 'يحتاج تعيين مشروع',
    projectId: null,
    project: 'لم يحدد مشروع بعد',
    next: 'تحديد مشروع لبطاقات العميل',
    trelloCards: 13,
  },
];

const TASKS = [
  { id: 'thabat-calendar', title: 'مراجعة التقويم التحريري', client: 'ثبات', projectId: 'thabat', project: 'تقويم تحريري وخطة محتوى', owner: 'مدير الحساب', due: 'هذا الأسبوع', status: 'للمراجعة', tone: 'warning' },
  { id: 'thabat-copy', title: 'تحرير مسودات الأسبوع الأول', client: 'ثبات', projectId: 'thabat', project: 'تقويم تحريري وخطة محتوى', owner: 'كاتب المحتوى', due: 'بعد الاعتماد', status: 'قيد الإعداد', tone: 'neutral' },
  { id: 'baraka-brief', title: 'اعتماد موجز العلامة', client: 'مزاد بركة', projectId: 'baraka', project: 'استراتيجية العلامة', owner: 'مالك / مدير مشاريع', due: 'غدًا', status: 'بانتظار قرار', tone: 'warning' },
  { id: 'baraka-research', title: 'تلخيص مخرجات الاكتشاف', client: 'مزاد بركة', projectId: 'baraka', project: 'استراتيجية العلامة', owner: 'مدير الحساب', due: 'هذا الأسبوع', status: 'قيد التنفيذ', tone: 'success' },
];

const PROJECT_OPTIONS = [
  { id: 'brand-strategy', title: 'استراتيجية العلامة', description: 'هوية بصرية ولفظية واكتشاف وقرارات العلامة.', icon: 'ph-sparkle' },
  { id: 'content-calendar', title: 'تقويم تحريري وخطة محتوى', description: 'استراتيجية محتوى وإنتاج ومراجعة ونشر.', icon: 'ph-calendar-dots' },
  { id: 'monthly-operations', title: 'خدمات تشغيلية شهرية', description: 'تشغيل مستمر ومتابعة شهرية وتسليمات متكررة.', icon: 'ph-arrows-clockwise' },
  { id: 'promotion-campaign', title: 'حملة إعلانية ترويجية', description: 'هدف الحملة ومخرجها وإطلاقها وقياسها.', icon: 'ph-rocket-launch' },
  { id: 'monthly-operations-campaign', title: 'خدمات تشغيلية شهرية + حملة ترويجية', description: 'نطاق سنام المعتمد: تشغيل مستمر مع مسار حملة ترويجية.', icon: 'ph-intersect' },
];

const NAV = [
  { id: 'home', label: 'الرئيسية', icon: 'ph-house-simple' },
  { id: 'tasks', label: 'المهام', icon: 'ph-check-square' },
  { id: 'sync', label: 'صندوق المزامنة', icon: 'ph-arrows-clockwise' },
  { id: 'clients', label: 'العملاء', icon: 'ph-buildings' },
  { id: 'projects', label: 'المشاريع', icon: 'ph-briefcase' },
  { id: 'internal-work', label: 'العمل الداخلي', icon: 'ph-buildings' },
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

function OperationalCardList({ cards, limit = 10, emptyCopy = 'لا توجد بطاقات في هذا المسار.' }) {
  const visibleCards = cards.slice(0, limit);
  if (!visibleCards.length) return <p className="agency-empty-copy">{emptyCopy}</p>;

  return (
    <div className="agency-operational-list">
      {visibleCards.map((card) => {
        const content = <><span className="agency-task-title"><i className="ph ph-trello-logo" /><strong>{card.title}</strong></span><span className="agency-task-context"><small>{card.client || card.stream || 'تحتاج تصنيفًا'}</small><strong>{card.project || card.reasonLabel}</strong></span><span className="agency-task-owner">{card.listName}</span><span className="agency-task-due">{card.dueLabel}</span><PrototypePill tone={card.stageTone}>{card.completed ? 'منجزة' : 'مقروءة من Trello'}</PrototypePill></>;
        return card.sourceUrl ? <a className="agency-task-row agency-operational-row" href={card.sourceUrl} target="_blank" rel="noreferrer" key={card.id}>{content}</a> : <div className="agency-task-row agency-operational-row" key={card.id}>{content}</div>;
      })}
    </div>
  );
}

function TrelloSourceNote({ source }) {
  return <section className="agency-source-note"><i className="ph ph-cloud-arrow-down" /><div><strong>{source.mode === 'live' ? 'قراءة Trello الحالية' : 'لقطة قراءة Trello'}</strong><span>{source.detail}</span></div></section>;
}

const PILOT_SYNC_RECORD = Object.freeze({
  operationId: 'sync-pilot-mr-art-brand-strategy',
  entityId: 'task-mr-art-brand-strategy',
  entityType: 'task',
  operation: 'create',
  status: 'synced',
  title: 'استراتيجية العلامة',
  client: 'مستر آرت',
  project: 'التأسيس',
  boardName: 'Test - مهام اليوم',
  listName: 'بانتظار البدء',
  externalId: 'ari:cloud:trello::card/workspace/6a4f3e3250aad9bfddcc108a/6a80b5fcb74f21fe6471d1d5',
  externalUrl: 'https://trello.com/c/sm7UagQq/70-%D8%A7%D8%B3%D8%AA%D8%B1%D8%A7%D8%AA%D9%8A%D8%AC%D9%8A%D8%A9-%D8%A7%D9%84%D8%B9%D9%84%D8%A7%D9%85%D8%A9',
  syncedAt: '2026-08-15T18:54:52.334Z',
});

function EntityStorePanel({ state }) {
  const pending = state.syncOperations.filter((operation) => ['pending_preview', 'pending_approval', 'approved', 'conflict', 'failed'].includes(operation.status));
  return (
    <section className="agency-panel agency-entity-store-panel">
      <div className="agency-panel-heading"><div><span className="agency-eyebrow">بيانات مَهَد</span><h2>ما تم حفظه داخليًا</h2></div><PrototypePill tone="success">محلي قابل للاستعادة</PrototypePill></div>
      <div className="agency-summary-grid agency-summary-grid-four"><article><span>العملاء</span><strong>{state.clients.length}</strong><small>كيانات محفوظة</small></article><article><span>المشاريع</span><strong>{state.projects.length}</strong><small>مرتبطة بالعملاء</small></article><article><span>المهام</span><strong>{state.tasks.length}</strong><small>وحدات تنفيذ</small></article><article><span>صندوق المزامنة</span><strong>{pending.length}</strong><small>عمليات تحتاج متابعة</small></article></div>
      {pending.length > 0 && <div className="agency-sync-queue-list">{pending.slice(0, 4).map((operation) => <div key={operation.id}><span><i className="ph ph-arrows-clockwise" /> {operation.entityType} · {operation.operation}</span><PrototypePill tone="warning">{operation.status === 'pending_approval' ? 'بانتظار الموافقة' : operation.status}</PrototypePill></div>)}</div>}
      {!pending.length && <p className="agency-empty-copy">لا توجد عمليات معلقة في صندوق المزامنة المحلي.</p>}
    </section>
  );
}

function SyncRecordPanel({ record }) {
  return (
    <section className="agency-panel agency-sync-record-panel">
      <div className="agency-panel-heading"><div><span className="agency-eyebrow">سجل المزامنة</span><h2>آخر كتابة محروسة</h2></div><PrototypePill tone="success">تمت المزامنة</PrototypePill></div>
      <div className="agency-sync-record-grid">
        <div><span>المهمة</span><strong>{record.title}</strong></div>
        <div><span>السياق</span><strong>{record.client} · {record.project}</strong></div>
        <div><span>الهدف الخارجي</span><strong>{record.boardName} · {record.listName}</strong></div>
        <div><span>معرّف العملية</span><strong>{record.operationId}</strong></div>
      </div>
      <div className="agency-sync-record-footer"><span><i className="ph ph-check-circle" /> تم التحقق من البطاقة في Trello</span><a href={record.externalUrl} target="_blank" rel="noreferrer">فتح البطاقة <i className="ph ph-arrow-up-left" /></a></div>
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

function HomeView({ onOpenProject, onOpenProjects, onOpenTemplate, onOpenCreate, operational, syncRecord, storeState }) {
  return (
    <div className="agency-preview-content">
      <section className="agency-hero">
        <div>
          <span className="agency-eyebrow">مساحة الوكالة</span>
          <h1>العمل من السياق إلى التسليم</h1>
          <p>نموذج تجربة لمدير حساب يرى العملاء والمشاريع والتسليمات، لا قائمة مهام شخصية معزولة.</p>
        </div>
        <div className="agency-hero-actions"><button type="button" className="agency-primary-btn" onClick={onOpenCreate}><i className="ph ph-plus-circle" /> إنشاء من مَهَد</button><button type="button" className="agency-secondary-btn" onClick={onOpenTemplate}><i className="ph ph-copy" /> مشروع من قالب</button></div>
      </section>

      <TrelloSourceNote source={operational.source} />
      <SyncRecordPanel record={syncRecord} />
      <EntityStorePanel state={storeState} />
      <section className="agency-summary-grid" aria-label="ملخص قراءة Trello">
        <article><span>بطاقات Board المقروءة</span><strong>{operational.report.total}</strong><small>كل البطاقات ظاهرة في أحد المسارات</small></article>
        <article><span>بطاقات العملاء</span><strong>{operational.report.client.length}</strong><small>ضمن 4 عملاء معروفين</small></article>
        <article><span>العمل الداخلي</span><strong>{operational.report.internal.length}</strong><small>علامة الأم، بعيدًا عن العملاء</small></article>
        <article><span>تحتاج تصنيفًا</span><strong>{operational.review.length}</strong><small>لا تتلقى تخمينًا تلقائيًا</small></article>
      </section>

      <section className="agency-section">
        <div className="agency-section-heading"><div><span className="agency-eyebrow">المشاريع</span><h2>حالة العمل الآن</h2></div><button type="button" onClick={onOpenProjects}>فتح كل المشاريع <i className="ph ph-arrow-left" /></button></div>
        <div className="agency-project-grid">
          {PROJECTS.map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpenProject} />)}
        </div>
      </section>

      <section className="agency-two-column">
        <article className="agency-panel agency-task-panel">
          <div className="agency-panel-heading"><h2>بطاقات مقروءة الآن</h2><PrototypePill tone="success">قراءة فقط</PrototypePill></div>
          <OperationalCardList cards={operational.operationalCards} limit={3} />
        </article>
        <article className="agency-panel">
          <div className="agency-panel-heading"><h2>من المعرفة إلى التنفيذ</h2><PrototypePill tone="success">المسار المقصود</PrototypePill></div>
          <ol className="agency-flow-list"><li><span>1</span> صفحة موجز أو محضر اجتماع</li><li><span>2</span> قرار أو إجراء واضح داخل الصفحة</li><li><span>3</span> مهمة مرتبطة بمالك وموعد</li><li><span>4</span> مخرج معتمد للعميل</li></ol>
        </article>
      </section>
    </div>
  );
}

function SavedProjectsPanel({ projects }) {
  return (
    <section className="agency-panel agency-saved-entities-panel">
      <div className="agency-panel-heading"><div><span className="agency-eyebrow">مشاريع مَهَد</span><h2>المشاريع المحفوظة داخليًا</h2></div><PrototypePill tone="success">{projects.length} مشروع</PrototypePill></div>
      {projects.length ? <div className="agency-saved-entity-list">{projects.map((project) => <div key={project.id}><div><strong>{project.name}</strong><span>مرتبطة بالعميل: {project.clientId}</span></div><PrototypePill>{project.type || 'نوع غير محدد'}</PrototypePill></div>)}</div> : <p className="agency-empty-copy">لم يُحفظ مشروع داخل مَهَد بعد.</p>}
    </section>
  );
}

function ClientsView({ onOpenProject, onOpenClientReview, operational, storeState }) {
  return (
    <div className="agency-preview-content">
      <ScreenHeader eyebrow="العلاقات" title="العملاء" description="هنا يبقى السياق المشترك للجهة المتعاقدة، ثم تنتقل منه إلى مشروع محدد ومخرجاته عندما يكون المشروع معتمدًا." />
      <section className="agency-panel agency-saved-entities-panel">
        <div className="agency-panel-heading"><div><span className="agency-eyebrow">سجل مَهَد</span><h2>العملاء المحفوظون داخليًا</h2></div><PrototypePill tone="success">{storeState.clients.length} عميل</PrototypePill></div>
        {storeState.clients.length ? <div className="agency-saved-entity-list">{storeState.clients.map((savedClient) => <div key={savedClient.id}><div><strong>{savedClient.name}</strong><span>{savedClient.description || 'لا يوجد وصف إضافي بعد'}</span></div><PrototypePill tone="success">{savedClient.status || 'active'}</PrototypePill></div>)}</div> : <p className="agency-empty-copy">لم يُحفظ عميل داخل مَهَد بعد.</p>}
      </section>
      <section className="agency-client-grid">
        {CLIENTS.map((client) => {
          const hasProject = Boolean(client.projectId);
          const operationalClient = operational.clients.find((item) => item.clientId === client.id);
          const cardCount = operationalClient?.cards.length ?? 0;
          return (
            <article className="agency-client-card" key={client.id}>
              <div className="agency-card-topline"><span className="agency-client-avatar">{client.name.charAt(0)}</span><PrototypePill tone={hasProject ? 'success' : 'warning'}>{client.relationship}</PrototypePill></div>
              <h2>{client.name}</h2>
              <p>{client.context}</p>
              <div className="agency-client-metric"><span>{hasProject ? 'المشروع النشط' : 'وضع المشروع'}</span><strong>{client.project}</strong></div>
              <div className="agency-client-metric"><span>{hasProject ? 'التسليم التالي' : 'الخطوة التالية'}</span><strong>{client.next}</strong></div>
              <div className="agency-client-metric"><span>بطاقات Trello المقروءة</span><strong>{cardCount} بطاقة</strong></div>
              <button type="button" className="agency-secondary-btn" onClick={() => hasProject ? onOpenProject(client.projectId) : onOpenClientReview(client.id)}>{hasProject ? 'فتح مشروع العميل' : 'عرض حالة العميل'} <i className="ph ph-arrow-left" /></button>
            </article>
          );
        })}
      </section>
      <section className="agency-guidance-panel"><i className="ph ph-info" /><div><strong>ماذا تمثل هذه الشاشة؟</strong><p>العميل هو العلاقة والسياق المستمر. المشروع هو العمل المحدد الذي ننجزه لهذا العميل الآن. لا تنشئ مَهَد مشروعًا لسنام أو علامة تسويق قبل اعتماده صراحة.</p></div></section>
    </div>
  );
}

function ClientNeedsProjectView({ client, onBack, onPreviewAssignment, operational }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const clientCards = operational.clients.find((item) => item.clientId === client.id)?.cards || [];
  const availableOptions = client.id === 'sanam'
    ? PROJECT_OPTIONS.filter((option) => ['monthly-operations', 'promotion-campaign', 'monthly-operations-campaign'].includes(option.id))
    : PROJECT_OPTIONS;
  return (
    <div className="agency-preview-content">
      <button type="button" className="agency-back-btn" onClick={onBack}><i className="ph ph-arrow-right" /> العودة إلى العملاء</button>
      <ScreenHeader eyebrow="عميل يحتاج تنظيم المشروع" title={client.name} description="هذا العميل معروف من Label Trello، لكن لا يوجد مشروع معتمد يمكن إسناد البطاقات إليه بأمان بعد." />
      <section className="agency-project-overview-grid">
        <article><span>بطاقات Trello المقروءة</span><strong>{clientCards.length}</strong><small>مرتبطة بـ Label العميل</small></article>
        <article><span>وضع المشروع</span><strong>غير معيّن</strong><small>لا تستنتج مَهَد مشروعًا من اسم البطاقة أو القائمة</small></article>
        <article><span>الإجراء المطلوب لاحقًا</span><strong>اعتماد مشروع</strong><small>ثم يربط صراحة ببطاقات العميل</small></article>
      </section>
      <section className="agency-decision-callout"><i className="ph ph-eye" /><div><strong>قبل أن تختار</strong><p>سترى أولًا البطاقات التي ستدخل في النطاق، ثم تختار نوع المشروع، ثم نعرض أثر الربط. لا يحدث اعتماد أو تعديل في هذه الخطوة.</p></div></section>
      <section className="agency-panel agency-task-panel"><div className="agency-panel-heading"><h2>بطاقات العميل المقروءة</h2><PrototypePill>قراءة فقط</PrototypePill></div><OperationalCardList cards={clientCards} limit={8} /></section>
      <section className="agency-panel agency-assignment-panel"><div className="agency-panel-heading"><h2>ما نوع المشروع؟</h2><PrototypePill tone="warning">اختيار يحتاج اعتمادًا</PrototypePill></div><p>{client.id === 'sanam' ? 'لسنام، النطاق الذي ذكره الفريق هو خدمات تشغيلية شهرية مع حملة ترويجية. اختر النطاق المركب إذا كان سيُدار كمشروع واحد، أو اختر مسارًا منفصلًا لمراجعته.' : 'اختر نوعًا لمعاينة أثر الربط فقط. لن يُحفظ الاختيار ولن تتغير Labels أو البطاقات في Trello.'}</p><div className="agency-assignment-options">{availableOptions.map((option) => <button type="button" key={option.id} className={`agency-assignment-option${selectedProject === option.id ? ' selected' : ''}`} onClick={() => setSelectedProject(option.id)}><i className={`ph ${option.icon}`} /><span><strong>{option.title}</strong><small>{option.description}</small></span>{selectedProject === option.id && <i className="ph ph-check-circle" />}</button>)}</div><button type="button" className="agency-primary-btn" disabled={!selectedProject} onClick={() => onPreviewAssignment({ clientId: client.id, projectOptionId: selectedProject })}>معاينة المطابقة قبل الاعتماد <i className="ph ph-arrow-left" /></button></section>
      <section className="agency-guidance-panel"><i className="ph ph-shield-check" /><div><strong>المعاينة ليست اعتمادًا</strong><p>لا تعدل هذه الشاشة Trello ولا تقترح مشروعًا تلقائيًا. الاعتماد النهائي يحتاج موافقة صريحة من مالك/مدير المشاريع ومدير الحساب.</p></div></section>
    </div>
  );
}

function ProjectAssignmentPreview({ assignment, client, operational, onBack }) {
  const option = PROJECT_OPTIONS.find((item) => item.id === assignment.projectOptionId);
  const clientCards = operational.clients.find((item) => item.clientId === client.id)?.cards || [];
  return (
    <div className="agency-preview-content">
      <button type="button" className="agency-back-btn" onClick={onBack}><i className="ph ph-arrow-right" /> العودة إلى مراجعة العميل</button>
      <ScreenHeader eyebrow="معاينة قبل الاعتماد" title={`${client.name} ← ${option?.title || 'مشروع مقترح'}`} description="هذه نتيجة مطابقة مؤقتة تساعد الفريق على مراجعة الأثر قبل اتخاذ قرار. لا تُنشئ مشروعًا ولا تغيّر بطاقات Trello." />
      <TrelloSourceNote source={operational.source} />
      <section className="agency-project-overview-grid"><article><span>البطاقات المتأثرة في المعاينة</span><strong>{clientCards.length}</strong><small>بطاقات العميل المقروءة حاليًا</small></article><article><span>المشروع المقترح</span><strong>{option?.title || 'غير محدد'}</strong><small>اختيار محلي غير محفوظ</small></article><article><span>حالة القرار</span><strong>بانتظار الاعتماد</strong><small>يتطلب مالك/مدير مشاريع ومدير حساب</small></article></section>
      <section className="agency-panel agency-assignment-panel"><div className="agency-panel-heading"><h2>ما الذي سيحدث لو اعتمد الفريق؟</h2><PrototypePill tone="warning">معاينة فقط</PrototypePill></div><ol className="agency-flow-list"><li><span>1</span> إنشاء تعريف مشروع مَهَد للعميل: {client.name}</li><li><span>2</span> ربط {clientCards.length} بطاقة بالـ Label الحالي للعميل</li><li><span>3</span> إبقاء Labels وقوائم Trello كما هي</li><li><span>4</span> عرض البطاقات ضمن المشروع بعد موافقة صريحة</li></ol><OperationalCardList cards={clientCards} limit={8} /></section>
      <section className="agency-guidance-panel"><i className="ph ph-hand" /><div><strong>لم يتم اعتماد أي شيء</strong><p>لا يوجد زر تنفيذ في هذه المرحلة. هذه الشاشة تسجل ما سيحدث فقط، ثم تنتظر موافقة الفريق قبل الانتقال إلى أي مسار كتابي.</p></div></section>
    </div>
  );
}

function InternalWorkView({ operational }) {
  const activeInternal = operational.internal.filter((card) => !card.completed);
  const waitingInternal = activeInternal.filter((card) => card.listName === 'بانتظار البدء');
  const inProgressInternal = activeInternal.filter((card) => card.listName === 'قيد التنفيذ');
  return (
    <div className="agency-preview-content">
      <ScreenHeader eyebrow="تشغيل الشركة" title="العمل الداخلي" description="مسار مستقل للمهام الإدارية والتنظيمية للشركة؛ لا يظهر ضمن العملاء أو مشاريعهم." />
      <section className="agency-summary-grid agency-summary-grid-three"><article><span>بطاقات علامة الأم</span><strong>{operational.internal.length}</strong><small>عمل إداري وتنظيمي داخلي</small></article><article><span>قيد التنفيذ</span><strong>{inProgressInternal.length}</strong><small>من قراءة Board الحالية</small></article><article><span>تحتاج البدء</span><strong>{waitingInternal.length}</strong><small>من قراءة Board الحالية</small></article></section>
      <section className="agency-panel agency-task-panel"><div className="agency-panel-heading"><h2>علامة الأم</h2><PrototypePill tone="success">داخلي</PrototypePill></div><p className="agency-empty-copy">تجمع هذه الوجهة التنظيم والتشغيل الإداري الداخلي للشركة، مثل المتابعة الإدارية والمكتبات والأدوات والإجراءات. لا تمثل علامة الأم عميلًا ولا تربط بطاقاتها بمشروعات العملاء.</p><OperationalCardList cards={operational.internal} limit={10} /></section>
      <section className="agency-guidance-panel"><i className="ph ph-buildings" /><div><strong>حدود المسار</strong><p>تظهر البطاقات ذات Label «ALH - علامة الأم» في هذا المسار عند ربط قراءة Trello بالواجهة. لا ينفذ النموذج الحالي أي إنشاء أو نقل أو تعديل في Trello.</p></div></section>
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

const SYNC_STATUS_LABELS = {
  pending_preview: 'بانتظار المعاينة',
  pending_approval: 'بانتظار الموافقة',
  approved: 'معتمدة للتنفيذ',
  synced: 'تمت المزامنة',
  conflict: 'تعارض يحتاج قرارًا',
  failed: 'فشل يحتاج مراجعة',
  local_only: 'محلي فقط',
  rejected: 'مرفوضة محليًا',
  resolved: 'تم حل التعارض محليًا',
};

function SyncInboxView({ storeState, onApprove, onReject, onExecute, onReadExternal, onResolveConflict, trelloReady }) {
  const operations = [...storeState.syncOperations].reverse();
  return (
    <div className="agency-preview-content">
      <ScreenHeader eyebrow="التحكم" title="صندوق المزامنة" description="هنا تظهر نية التغيير ونتيجته داخل مَهَد. لا تُرسل العملية إلى Trello من هذه الشاشة تلقائيًا؛ كل كتابة تحتاج معاينة وموافقة وسجل نتيجة." />
      <section className="agency-summary-grid agency-summary-grid-four" aria-label="ملخص صندوق المزامنة"><article><span>كل العمليات</span><strong>{operations.length}</strong><small>سجل مَهَد المحلي</small></article><article><span>بانتظار الموافقة</span><strong>{operations.filter((item) => item.status === 'pending_approval').length}</strong><small>تحتاج قرارًا</small></article><article><span>تعارضات</span><strong>{operations.filter((item) => item.status === 'conflict').length}</strong><small>لا تُطبق تلقائيًا</small></article><article><span>فشل</span><strong>{operations.filter((item) => item.status === 'failed').length}</strong><small>تحتاج مراجعة</small></article></section>
      <section className="agency-panel agency-sync-inbox-panel">
        <div className="agency-panel-heading"><div><span className="agency-eyebrow">سجل قابل للتدقيق</span><h2>العمليات</h2></div><PrototypePill tone="success">مَهَد أولًا</PrototypePill></div>
        {operations.length ? <div className="agency-sync-operation-list">{operations.map((operation) => <article key={operation.id}><div className="agency-sync-operation-top"><div><strong>{operation.payload?.title || operation.payload?.name || operation.entityId}</strong><span>{operation.entityType} · {operation.operation} · {operation.id}</span></div><PrototypePill tone={operation.status === 'synced' ? 'success' : operation.status === 'conflict' || operation.status === 'failed' ? 'warning' : 'neutral'}>{SYNC_STATUS_LABELS[operation.status] || operation.status}</PrototypePill></div><div className="agency-sync-operation-meta"><span>الهدف: {operation.payload?.projectId || operation.payload?.clientId || 'يحتاج خريطة خارجية'}</span><span>{operation.createdAt ? new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(operation.createdAt)) : 'وقت غير مسجل'}</span></div>{operation.status === 'pending_approval' && <div className="agency-sync-operation-actions"><button type="button" className="agency-primary-btn" onClick={() => onApprove(operation)}>اعتماد محلي وتجهيز للتنفيذ</button><button type="button" className="agency-secondary-btn" onClick={() => onReject(operation)}>رفض العملية</button></div>}{operation.status === 'approved' && <div className="agency-sync-operation-actions"><button type="button" className="agency-primary-btn" onClick={() => onExecute(operation)} disabled={!trelloReady}>{trelloReady ? 'تنفيذ العملية المعتمدة في Trello' : 'اربط Board وقائمة Trello أولًا'}</button></div>}{operation.status === 'synced' && operation.externalId && <div className="agency-sync-operation-actions"><button type="button" className="agency-secondary-btn" onClick={() => onReadExternal(operation)} disabled={!trelloReady}>فحص التغييرات من Trello</button></div>}{operation.status === 'conflict' && operation.inboundProposal?.conflict && <div className="agency-conflict-review"><strong>مراجعة الفرق</strong><div className="agency-conflict-table"><span>الحقل</span><span>مَهَد</span><span>Trello</span>{operation.inboundProposal.conflict.fields.map((field) => <><strong key={`${operation.id}-${field}-label`}>{field}</strong><span key={`${operation.id}-${field}-local`}>{String(operation.inboundProposal.conflict.local[field] ?? '—')}</span><span key={`${operation.id}-${field}-external`}>{String(operation.inboundProposal.conflict.external[field] ?? '—')}</span></>)}</div><div className="agency-sync-operation-actions"><button type="button" className="agency-primary-btn" onClick={() => onResolveConflict(operation, 'accept_external')}>اعتماد نسخة Trello داخل مَهَد</button><button type="button" className="agency-secondary-btn" onClick={() => onResolveConflict(operation, 'keep_local')}>الإبقاء على نسخة مَهَد</button></div></div>}{operation.status === 'failed' && <p className="agency-sync-warning"><i className="ph ph-x-circle" /> فشل التنفيذ: {operation.error || 'سبب الفشل غير مسجل.'}</p>}{operation.status === 'conflict' && <p className="agency-sync-warning"><i className="ph ph-warning" /> لا يُستبدل أي تغيير حتى يراجع الفريق الفرق بين مَهَد وTrello.</p>}</article>)}</div> : <p className="agency-empty-copy">لا توجد عمليات في صندوق المزامنة. أنشئ كيانًا من مَهَد ثم ضعه في صندوق الموافقة.</p>}
      </section>
      <section className="agency-guidance-panel"><i className="ph ph-shield-check" /><div><strong>الحد التشغيلي الحالي</strong><p>هذه الشاشة تسجل العملية وتوضح حالتها، لكنها لا تنفذ كتابة خارجية تلقائيًا. توصيل زر الاعتماد بموصل Trello يأتي بعد اعتماد سياسة المزامنة وصلاحيات الفريق.</p></div></section>
    </div>
  );
}

function TasksView({ operational, storeState }) {
  return (
    <div className="agency-preview-content">
      <ScreenHeader eyebrow="التنفيذ" title="المهام" description="هذه قراءة للبطاقات التشغيلية من Board؛ كل صف يظهر العميل أو العمل الداخلي وقائمة Trello والموعد ورابط المصدر." />
      <TrelloSourceNote source={operational.source} />
      <section className="agency-panel agency-saved-entities-panel"><div className="agency-panel-heading"><div><span className="agency-eyebrow">تنفيذ مَهَد</span><h2>المهام المحفوظة داخليًا</h2></div><PrototypePill tone="success">{storeState.tasks.length} مهمة</PrototypePill></div>{storeState.tasks.length ? <div className="agency-saved-entity-list">{storeState.tasks.map((task) => <div key={task.id}><div><strong>{task.title}</strong><span>{task.clientId} · {task.projectId} · {task.assigneeId || 'بلا مالك'}</span></div><PrototypePill>{task.status || 'not_started'}</PrototypePill></div>)}</div> : <p className="agency-empty-copy">لم تُحفظ مهمة داخل مَهَد بعد.</p>}</section>
      <section className="agency-panel agency-task-panel"><div className="agency-panel-heading"><h2>كل البطاقات التشغيلية</h2><PrototypePill tone="success">{operational.operationalCards.length} بطاقة</PrototypePill></div><OperationalCardList cards={operational.operationalCards} limit={20} /></section>
      <section className="agency-panel agency-task-panel"><div className="agency-panel-heading"><h2>تحتاج تصنيفًا</h2><PrototypePill tone="warning">{operational.review.length} بطاقات</PrototypePill></div><OperationalCardList cards={operational.review} limit={10} emptyCopy="كل البطاقات مقسمة إلى عميل أو عمل داخلي أو قالب." /></section>
      <section className="agency-guidance-panel"><i className="ph ph-link-simple" /><div><strong>كل صف رابط مصدر</strong><p>يفتح الصف البطاقة الأصلية في Trello. لا ينفذ العرض أي تعديل أو نقل أو إنشاء لبطاقة.</p></div></section>
    </div>
  );
}

function MyWorkView({ onOpenTasks }) {
  return (
    <div className="agency-preview-content">
      <ScreenHeader eyebrow="منظور شخصي" title="عملي" description="سيعرض هذا المنظور البطاقات المسندة إلى المستخدم بعد ربط عضو Trello بدور مَهَد. لا يخمن النموذج الحالي ملكية شخصية من أسماء البطاقات." action={<button type="button" className="agency-secondary-btn" onClick={onOpenTasks}>كل مهام الفريق <i className="ph ph-arrow-left" /></button>} />
      <section className="agency-summary-grid agency-summary-grid-three"><article><span>التعيين الشخصي</span><strong>قيد الإعداد</strong><small>يحتاج ربط عضو Trello بالدور</small></article><article><span>مصدر المهام</span><strong>Trello</strong><small>قراءة فقط في المرحلة الحالية</small></article><article><span>إجراء متاح</span><strong>استعراض</strong><small>بدون تعديل أو نقل بطاقة</small></article></section>
      <section className="agency-guidance-panel"><i className="ph ph-user-circle" /><div><strong>لماذا لا تظهر قائمة شخصية بعد؟</strong><p>تحتوي قراءة Board الحالية على معرفات أعضاء Trello، لكن لم يعتمد بعد ربطها بهوية أعضاء مَهَد وأدوارهم. سيضاف هذا الربط قبل ادعاء أن البطاقة «عملي».</p></div></section>
    </div>
  );
}

function ProjectView({ project, onBack, onOpenTemplates, operational }) {
  const [tab, setTab] = useState('overview');
  const projectTasks = operational.clientCards.filter((task) => task.client === project.client && task.project);
  const tabContent = useMemo(() => ({
    overview: <><div className="agency-project-overview-grid"><article><span>تقدم المشروع</span><strong>{project.progress}%</strong><div className="agency-progress-track"><span style={{ width: `${project.progress}%` }} /></div></article><article><span>التسليم التالي</span><strong>{project.due.replace('التسليم القادم: ', '')}</strong><small>ضمن سياق المشروع نفسه</small></article><article><span>الفريق</span><strong>{project.team.length} أدوار</strong><small>{project.team.join(' · ')}</small></article></div><section className="agency-panel agency-brief-panel"><div className="agency-panel-heading"><h2>ملخص المشروع</h2><PrototypePill>Page + Tasks</PrototypePill></div><p>يضم المشروع موجز العميل والقرارات والروابط والمخرجات، ثم يحول الإجراءات الواضحة إلى مهام مرتبطة به، لا إلى بطاقات بلا سياق.</p><button type="button" onClick={onOpenTemplates}><i className="ph ph-files" /> عرض قالب المشروع</button></section></>,
    work: <section className="agency-panel agency-task-panel"><div className="agency-panel-heading"><h2>بطاقات المشروع المقروءة</h2><PrototypePill tone="success">قراءة فقط</PrototypePill></div><OperationalCardList cards={projectTasks} limit={20} emptyCopy="لا توجد بطاقات مقروءة لهذا المشروع." /></section>,
    pages: <section className="agency-panel"><div className="agency-panel-heading"><h2>صفحات المشروع</h2><PrototypePill tone="success">نموذج معرفة</PrototypePill></div><div className="agency-page-list"><button type="button"><i className="ph ph-file-text" /> موجز العميل <span>الصفحة الأساسية</span></button><button type="button"><i className="ph ph-users-three" /> محضر اجتماع الاكتشاف <span>3 إجراءات قابلة للتحويل</span></button><button type="button"><i className="ph ph-checklist" /> قائمة تسليم العميل <span>قيد الإعداد</span></button></div></section>,
    activity: <section className="agency-panel"><div className="agency-panel-heading"><h2>النشاط</h2><PrototypePill>سجل موحد</PrototypePill></div><p className="agency-empty-copy">سيجمع هذا التبويب قرارات الصفحة وتحديثات المهام والاعتمادات داخل سجل قابل للتدقيق عند بناء طبقة الفريق.</p></section>,
  })[tab], [onOpenTemplates, operational, project, projectTasks, tab]);

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

function CreateWorkspaceView({ onBack, drafts, onCreated, onPreviewDraft }) {
  const [kind, setKind] = useState('client');
  const [form, setForm] = useState({ name: '', clientId: '', type: 'monthly-operations-campaign', title: '', projectId: '', assigneeId: '', dueDate: '' });
  const [message, setMessage] = useState('');

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    try {
      const now = new Date().toISOString();
      const entity = kind === 'client'
        ? createClient({ name: form.name, now })
        : kind === 'project'
          ? createProject({ clientId: form.clientId || 'client-draft', name: form.name, type: form.type, now })
          : createTask({ clientId: form.clientId || 'client-draft', projectId: form.projectId || 'project-draft', title: form.title, assigneeId: form.assigneeId, dueDate: form.dueDate || null, now });
      onCreated({ ...entity, localOnly: true });
      setMessage('تم إنشاء مسودة داخل مَهَد لهذه الجلسة. لم تُحفظ بعد ولم تُرسل إلى Trello.');
      setForm({ name: '', clientId: '', type: 'monthly-operations-campaign', title: '', projectId: '', assigneeId: '', dueDate: '' });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const labels = { client: 'عميل', project: 'مشروع', task: 'مهمة' };
  return (
    <div className="agency-preview-content">
      <button type="button" className="agency-back-btn" onClick={onBack}><i className="ph ph-arrow-right" /> العودة إلى الرئيسية</button>
      <ScreenHeader eyebrow="إنشاء داخل مَهَد" title="أنشئ من مكان العمل" description="هذه أول طبقة من تجربة الإنشاء اليومية. المسودة تبقى داخل مَهَد في هذه المرحلة، ثم ستنتقل لاحقًا إلى التخزين المشترك وصندوق الموافقة." />
      <section className="agency-create-switcher" aria-label="نوع الكيان"><span>ماذا تريد إنشاءه؟</span>{Object.entries(labels).map(([id, label]) => <button type="button" key={id} className={kind === id ? 'active' : ''} onClick={() => { setKind(id); setMessage(''); }}>{label}</button>)}</section>
      <form className="agency-panel agency-create-form" onSubmit={submit}>
        {kind === 'client' && <><label>اسم العميل<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="مثل: عميل جديد" required /></label><label>وصف وسياق العميل<textarea value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="ما الذي يجب أن يعرفه الفريق؟" /></label></>}
        {kind === 'project' && <><label>اسم المشروع<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="مثل: خطة إطلاق" required /></label><label>معرّف العميل داخل مَهَد<input value={form.clientId} onChange={(event) => update('clientId', event.target.value)} placeholder="سيصبح اختيارًا من سجل العملاء" required /></label><label>نوع المشروع<select value={form.type} onChange={(event) => update('type', event.target.value)}>{PROJECT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label></>}
        {kind === 'task' && <><label>عنوان المهمة<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="ما الذي يجب إنجازه؟" required /></label><div className="agency-form-grid"><label>معرّف العميل<input value={form.clientId} onChange={(event) => update('clientId', event.target.value)} placeholder="client-..." required /></label><label>معرّف المشروع<input value={form.projectId} onChange={(event) => update('projectId', event.target.value)} placeholder="project-..." required /></label></div><div className="agency-form-grid"><label>المالك أو الدور<input value={form.assigneeId} onChange={(event) => update('assigneeId', event.target.value)} placeholder="مدير الحساب" /></label><label>الموعد<input type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} /></label></div></>}
        <button type="submit" className="agency-primary-btn"><i className="ph ph-check" /> إنشاء مسودة {labels[kind]} داخل مَهَد</button>
        {message && <p className={`agency-form-message${message.includes('تم إنشاء') ? ' success' : ' error'}`}>{message}</p>}
      </form>
      <section className="agency-panel"><div className="agency-panel-heading"><h2>مسودات هذه الجلسة</h2><PrototypePill tone="warning">غير محفوظة</PrototypePill></div>{drafts.length ? <div className="agency-draft-list">{drafts.map((draft) => <div className="agency-draft-row" key={draft.id}><div><strong>{draft.name || draft.title}</strong><span>{draft.entityType === 'client' ? 'عميل' : draft.entityType === 'project' ? 'مشروع' : 'مهمة'} · {draft.syncStatus === 'pending_approval' ? 'بانتظار الموافقة' : 'مسودة مَهَد'}</span></div><button type="button" className="agency-inline-btn" onClick={() => onPreviewDraft(draft)}>معاينة الإرسال</button></div>)}</div> : <p className="agency-empty-copy">لم تنشئ مسودة بعد. جرّب إنشاء عميل أو مشروع أو مهمة من هذه الشاشة.</p>}</section>
      <section className="agency-guidance-panel"><i className="ph ph-shield-check" /><div><strong>ما الذي لم يحدث؟</strong><p>لم تُكتب أي بطاقة أو Label في Trello. بعد بناء التخزين المشترك ستتحول المسودة إلى عملية معاينة ثم موافقة ثم مزامنة.</p></div></section>
    </div>
  );
}

function ChangePreviewView({ draft, onBack, onQueue }) {
  const kindLabel = draft.entityType === 'client' ? 'عميل' : draft.entityType === 'project' ? 'مشروع' : 'مهمة';
  const target = draft.entityType === 'client' ? 'إنشاء سجل عميل وربطه بـ Label مناسب بعد اعتماد السياسة' : draft.entityType === 'project' ? 'إنشاء تعريف مشروع وربطه بالعميل دون استنتاجه من Label' : 'إنشاء بطاقة Trello في القائمة المعتمدة وربطها بالعميل والمشروع';
  return (
    <div className="agency-preview-content">
      <button type="button" className="agency-back-btn" onClick={onBack}><i className="ph ph-arrow-right" /> العودة إلى الإنشاء</button>
      <ScreenHeader eyebrow="صندوق التغييرات" title="معاينة قبل الإرسال" description="هذه الشاشة تفصل إنشاء الكيان داخل مَهَد عن أي كتابة خارجية. راجع الأثر ثم ضعه في صندوق الموافقة؛ لن يُرسل شيء إلى Trello من هذه الخطوة." />
      <section className="agency-project-overview-grid"><article><span>الكيان</span><strong>{kindLabel}</strong><small>{draft.name || draft.title}</small></article><article><span>الحالة الحالية</span><strong>{draft.syncStatus === 'pending_approval' ? 'بانتظار الموافقة' : 'مسودة محلية'}</strong><small>لا توجد كتابة خارجية</small></article><article><span>المعرّف الداخلي</span><strong>{draft.id}</strong><small>يُستخدم للربط لاحقًا</small></article></section>
      <section className="agency-panel agency-change-preview"><div className="agency-panel-heading"><h2>الأثر المقترح</h2><PrototypePill tone="warning">معاينة فقط</PrototypePill></div><ol className="agency-flow-list"><li><span>1</span> يبقى {kindLabel} محفوظًا داخل مَهَد.</li><li><span>2</span> {target}.</li><li><span>3</span> تظهر نتيجة التنفيذ أو الفشل داخل مَهَد.</li><li><span>4</span> عند التعارض يتوقف الإرسال ولا تُستبدل بيانات المصدر تلقائيًا.</li></ol></section>
      <section className="agency-guidance-panel"><i className="ph ph-shield-check" /><div><strong>ممنوع التنفيذ من هنا</strong><p>وضع العملية في صندوق الموافقة يسجل نية الإرسال فقط. مرحلة موصل Trello اللاحقة هي التي ستطلب موافقة صاحب الصلاحية وتنفذ بعد اكتمال التخزين المشترك.</p></div></section>
      {draft.syncStatus !== 'pending_approval' && <button type="button" className="agency-primary-btn" onClick={onQueue}>وضع في صندوق الموافقة <i className="ph ph-arrow-left" /></button>}
      {draft.syncStatus === 'pending_approval' && <p className="agency-form-message success">تم وضع العملية في صندوق الموافقة المحلي. لا توجد كتابة إلى Trello.</p>}
    </div>
  );
}

function TemplateView({ onBack, operational }) {
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
      <section className="agency-panel agency-task-panel"><div className="agency-panel-heading"><h2>بطاقات قوالب Trello المقروءة</h2><PrototypePill>{operational.templates.length} قالب</PrototypePill></div><OperationalCardList cards={operational.templates} limit={12} emptyCopy="لا توجد بطاقات في قائمة قوالب المهام ضمن مصدر القراءة." /></section>
    </div>
  );
}

export default function AgencyWorkspacePreview({ trelloTasks = [], trelloConnection }) {
  const [section, setSection] = useState('home');
  const [projectId, setProjectId] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const repository = useMemo(() => createMahdRepository(), []);
  const [drafts, setDrafts] = useState(() => repository.listDrafts());
  const [syncRecord] = useState(PILOT_SYNC_RECORD);
  const [storeState, setStoreState] = useState(() => repository.load());
  const [selectedDraft, setSelectedDraft] = useState(null);
  const connectedTrelloTasks = useMemo(
    () => (Array.isArray(trelloTasks) ? trelloTasks.filter((task) => task.externalSource === 'trello') : []),
    [trelloTasks]
  );
  const selectedBoardIsPilot = [PILOT_BOARD_ID, PILOT_BOARD_SHORT_LINK].includes(String(trelloConnection?.config?.boardId || ''));
  const liveTrelloTasks = selectedBoardIsPilot ? connectedTrelloTasks : [];
  const source = useMemo(() => {
    if (liveTrelloTasks.length) {
      return { mode: 'live', detail: `${liveTrelloTasks.length} بطاقة محملة من Board Pilot المتصل حاليًا.` };
    }
    const fallbackSuffix = connectedTrelloTasks.length && !selectedBoardIsPilot
      ? ' Board المتصل حاليًا ليس Board Pilot، لذلك لم تخلط المنصة بياناته بالعرض.'
      : trelloConnection?.isConnected
        ? ' لم تحمل بطاقات من Board Pilot المتصل بعد.'
        : '';
    return {
      mode: 'snapshot',
      detail: `${trelloReadSnapshot.taskCount} بطاقة في لقطة قراءة بتاريخ ${new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(trelloReadSnapshot.readAt))}.${fallbackSuffix}`,
    };
  }, [connectedTrelloTasks.length, liveTrelloTasks.length, selectedBoardIsPilot, trelloConnection?.isConnected]);
  const operational = useMemo(
    () => buildAgencyOperationalView(liveTrelloTasks.length ? liveTrelloTasks : trelloReadSnapshot.tasks, source),
    [liveTrelloTasks, source]
  );
  const project = PROJECTS.find((item) => item.id === projectId);
  const client = CLIENTS.find((item) => item.id === clientId);

  const openProject = (id) => { setProjectId(id); setClientId(null); setSection('project'); };
  const openClientReview = (id) => { setProjectId(null); setClientId(id); setAssignment(null); setSection('client-review'); };
  const openAssignmentPreview = (nextAssignment) => { setProjectId(null); setAssignment(nextAssignment); setSection('assignment-preview'); };
  const openTemplates = () => { setProjectId(null); setClientId(null); setAssignment(null); setSection('templates'); };
  const openCreate = () => { setProjectId(null); setClientId(null); setAssignment(null); setSelectedDraft(null); setSection('create'); };
  const openDraftPreview = (draft) => { setSelectedDraft(draft); setSection('sync-preview'); };
  const saveCreatedDraft = (draft) => {
    if (draft.entityType === 'client') repository.saveClient(draft);
    if (draft.entityType === 'project') repository.saveProject(draft);
    if (draft.entityType === 'task') repository.saveTask(draft);
    const draftRecord = { ...draft, syncStatus: 'local_only', localOnly: true };
    repository.saveDraft(draftRecord);
    setStoreState(repository.load());
    setDrafts((current) => [draftRecord, ...current.filter((item) => item.id !== draftRecord.id)]);
  };
  const updateSyncOperation = (operation, status, patch = {}) => {
    const next = { ...operation, status, ...patch, updatedAt: new Date().toISOString() };
    repository.saveSyncOperation(next);
    setStoreState(repository.load());
  };
  const approveSyncOperation = (operation) => updateSyncOperation(operation, 'approved', { approvedBy: 'owner-local-pilot', approvedAt: new Date().toISOString() });
  const rejectSyncOperation = (operation) => updateSyncOperation(operation, 'rejected', { rejectedBy: 'owner-local-pilot', rejectedAt: new Date().toISOString(), error: 'رُفضت العملية محليًا قبل أي كتابة خارجية.' });
  const resolveSyncConflict = (operation, resolution) => {
    const proposal = operation.inboundProposal;
    if (resolution === 'accept_external' && proposal?.conflict?.external) {
      const external = proposal.conflict.external;
      const currentTask = repository.load().tasks.find((task) => task.id === operation.entityId);
      if (currentTask) repository.saveTask({ ...currentTask, title: external.name || currentTask.title, description: external.description || '', dueDate: external.dueDate || null, updatedAt: new Date().toISOString() });
    }
    updateSyncOperation(operation, 'resolved', { resolution, resolvedBy: 'owner-local-pilot', resolvedAt: new Date().toISOString() });
  };
  const readExternalOperation = async (operation) => {
    const config = trelloConnection?.config;
    if (!config?.apiKey || !config?.accessToken || !config?.boardId || !operation.externalId) return;
    try {
      const cards = await trelloFetchBoardCards(config.apiKey, config.accessToken, config.boardId);
      const externalCard = (cards || []).find((card) => String(card.id) === String(operation.externalId));
      if (!externalCard) {
        updateSyncOperation(operation, 'failed', { error: 'لم تُعثر على البطاقة المرتبطة في Board الحالي.' });
        return;
      }
      const proposal = buildInboundChangeProposal({ entityId: operation.entityId, externalId: operation.externalId, localSnapshot: operation.result || operation.payload, externalCard });
      if (proposal.status === 'conflict') updateSyncOperation(operation, 'conflict', { inboundProposal: proposal, lastReadAt: new Date().toISOString() });
      else updateSyncOperation(operation, 'synced', { inboundProposal: proposal, lastReadAt: new Date().toISOString() });
    } catch (error) {
      updateSyncOperation(operation, 'failed', { error: error.message || 'تعذر قراءة التغييرات من Trello.' });
    }
  };
  const executeApprovedOperation = async (operation) => {
    const config = trelloConnection?.config;
    const plan = buildTrelloWritePlan(operation, { defaultListId: config?.defaultListId });
    if (!config?.apiKey || !config?.accessToken || !config?.defaultListId || !plan.supported) {
      updateSyncOperation(operation, 'failed', { error: 'لا يوجد هدف Trello مكتمل أو أن العملية غير مدعومة.' });
      return;
    }
    try {
      const result = await executeApprovedTrelloWrite({ operation, plan, apiKey: config.apiKey, accessToken: config.accessToken, approvedBy: operation.approvedBy });
      updateSyncOperation(operation, 'synced', { executedAt: new Date().toISOString(), externalId: result?.id || result?.externalId || null, externalUrl: result?.url || result?.externalUrl || null, result });
    } catch (error) {
      updateSyncOperation(operation, 'failed', { error: error.message || 'تعذر تنفيذ العملية في Trello.' });
    }
  };
  const queueDraftForApproval = () => {
    if (!selectedDraft) return;
    const next = { ...selectedDraft, syncStatus: 'pending_approval', updatedAt: new Date().toISOString() };
    const operation = createSyncOperation({
      entityType: selectedDraft.entityType,
      entityId: selectedDraft.id,
      operation: 'create',
      payload: {
        title: selectedDraft.title || selectedDraft.name,
        name: selectedDraft.name,
        description: selectedDraft.description || '',
        clientId: selectedDraft.clientId || null,
        projectId: selectedDraft.projectId || null,
      },
      status: 'pending_approval',
    });
    repository.saveDraft(next);
    repository.saveSyncOperation(operation);
    setStoreState(repository.load());
    setDrafts((current) => current.map((draft) => draft.id === next.id ? next : draft));
    setSelectedDraft(next);
  };
  const openSection = (id) => { setProjectId(null); setClientId(null); setAssignment(null); setSection(id === 'library' ? 'templates' : id); };

  return (
    <div className="agency-preview-shell" dir="rtl">
      <header className="agency-preview-banner"><i className="ph ph-shield-check" /> نموذج Pilot — مَهَد أولًا، وكتابة Trello محروسة بعد المعاينة والموافقة</header>
      <div className="agency-preview-frame">
        <aside className="agency-preview-nav" aria-label="التنقل التجريبي">
          <div className="agency-workspace-mark"><span>م</span><div><strong>وكالة مَهَد</strong><small>مساحة تجريبية</small></div></div>
          {NAV.map((item) => <button type="button" key={item.id} className={section === item.id || (item.id === 'clients' && section === 'client-review') || (item.id === 'library' && section === 'templates') ? 'active' : ''} onClick={() => openSection(item.id)}><i className={`ph ${item.icon}`} /> {item.label}</button>)}
          <div className="agency-nav-note"><i className="ph ph-info" /> هدف النموذج: اختبار السياق والتدفق قبل بناء البيانات أو الأتمتة.</div>
        </aside>
        <main className="agency-preview-main">
          {section === 'home' && <HomeView onOpenProject={openProject} onOpenProjects={() => openSection('projects')} onOpenTemplate={openTemplates} onOpenCreate={openCreate} operational={operational} syncRecord={syncRecord} storeState={storeState} />}
          {section === 'clients' && <ClientsView onOpenProject={openProject} onOpenClientReview={openClientReview} operational={operational} storeState={storeState} />}
          {section === 'client-review' && client && <ClientNeedsProjectView client={client} onBack={() => openSection('clients')} onPreviewAssignment={openAssignmentPreview} operational={operational} />}
          {section === 'assignment-preview' && client && assignment && <ProjectAssignmentPreview assignment={assignment} client={client} operational={operational} onBack={() => openClientReview(client.id)} />}
          {section === 'projects' && <><SavedProjectsPanel projects={storeState.projects} /><ProjectsView onOpenProject={openProject} /></>}
          {section === 'internal-work' && <InternalWorkView operational={operational} />}
          {section === 'tasks' && <TasksView operational={operational} storeState={storeState} />}
          {section === 'sync' && <SyncInboxView storeState={storeState} onApprove={approveSyncOperation} onReject={rejectSyncOperation} onExecute={executeApprovedOperation} onReadExternal={readExternalOperation} onResolveConflict={resolveSyncConflict} trelloReady={Boolean(trelloConnection?.config?.apiKey && trelloConnection?.config?.accessToken && trelloConnection?.config?.defaultListId)} />}
          {section === 'my-work' && <MyWorkView onOpenTasks={() => openSection('tasks')} />}
          {section === 'project' && project && <ProjectView project={project} onBack={() => openSection('projects')} onOpenTemplates={openTemplates} operational={operational} />}
          {section === 'templates' && <TemplateView onBack={() => openSection('home')} operational={operational} />}
          {section === 'create' && <CreateWorkspaceView onBack={() => openSection('home')} drafts={drafts} onCreated={saveCreatedDraft} onPreviewDraft={openDraftPreview} />}
          {section === 'sync-preview' && selectedDraft && <ChangePreviewView draft={selectedDraft} onBack={() => openSection('create')} onQueue={queueDraftForApproval} />}
        </main>
      </div>
    </div>
  );
}
