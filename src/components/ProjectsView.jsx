import { formatProjectActivity } from '../utils/trelloProjects';

export default function ProjectsView({
  projects = [],
  selectedProject = null,
  onSelectProject,
  loading = false,
  connected = false,
}) {
  if (!connected) {
    return (
      <section className="projects-view projects-empty-state">
        <div className="projects-empty-icon"><i className="ph ph-plugs-connected" /></div>
        <h1>اربط Trello لعرض المشاريع</h1>
        <p>في هذه النسخة، كل Board متاح في Trello يظهر كمشروع داخل مَهَد.</p>
      </section>
    );
  }

  return (
    <section className="projects-view" aria-labelledby="projects-title">
      <header className="projects-hero">
        <div>
          <span className="eyebrow"><i className="ph ph-kanban" /> مشاريع Trello</span>
          <h1 id="projects-title">Project Hub</h1>
          <p>
            اختر مشروعًا لعرض بطاقاته في المصفوفة والجدول والخط الزمني والتقويم وجانت.
          </p>
        </div>
        <div className="projects-hero-stat" aria-label={`${projects.length} مشروع متاح`}>
          <strong>{projects.length}</strong>
          <span>مشاريع متاحة</span>
        </div>
      </header>

      <div className="projects-source-note" role="note">
        <i className="ph ph-info" />
        <span>Board Trello هو المشروع في هذه النسخة. لا ينشئ مَهَد Projects أو Boards موازية.</span>
      </div>

      {loading ? (
        <div className="projects-loading" aria-live="polite">
          <i className="ph ph-spinner-gap" /> جارٍ تحميل مشاريع Trello…
        </div>
      ) : projects.length === 0 ? (
        <div className="projects-empty-state">
          <div className="projects-empty-icon"><i className="ph ph-folder-open" /></div>
          <h2>لا توجد Boards مفتوحة في Trello</h2>
          <p>تأكد من صلاحية الحساب، ثم حدّث قائمة الـ Boards من إعدادات Trello.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => {
            const isActive = selectedProject?.id === project.id;
            return (
              <article key={project.id} className={`project-card ${isActive ? 'is-active' : ''}`}>
                <div className="project-card-topline">
                  <span className="project-card-source"><i className="ph ph-kanban" /> Trello</span>
                  {isActive && <span className="project-active-badge"><i className="ph ph-check" /> نشط الآن</span>}
                </div>
                <h2>{project.title}</h2>
                <p className="project-activity">
                  <i className="ph ph-clock-counter-clockwise" /> آخر نشاط: {formatProjectActivity(project.lastActivityAt)}
                </p>
                <div className="project-card-actions">
                  <button
                    type="button"
                    className={isActive ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => onSelectProject?.(project.id)}
                    disabled={isActive || loading}
                  >
                    <i className={`ph ${isActive ? 'ph-check-circle' : 'ph-arrow-left'}`} />
                    {isActive ? 'المشروع النشط' : 'فتح المشروع'}
                  </button>
                  {project.externalUrl && (
                    <a
                      className="btn-icon project-open-trello"
                      href={project.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="فتح Board في Trello"
                      aria-label={`فتح ${project.title} في Trello`}
                    >
                      <i className="ph ph-arrow-square-out" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
