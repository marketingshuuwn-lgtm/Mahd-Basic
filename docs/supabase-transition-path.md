# مسار الانتقال من Trello-first إلى Supabase جديد

## نقطة البداية الفعلية

في النسخة الحالية، Trello هو مصدر الحقيقة المؤقت لبطاقة المهمة. يختار المستخدم Board واحدًا، وتقرأ مَهَد البطاقات والقوائم وتستطيع إنشاء بطاقة في القائمة الافتراضية. تظهر البطاقة داخل واجهة مَهَد من خلال `useTasks` فقط؛ لا تستدعي المكوّنات Trello أو Supabase مباشرة.

توجد بيانات واجهة محلية لا يمكن تمثيلها مباشرة في Trello، مثل موضع مصفوفة أيزنهاور ومدة التقدير وحالة مَهَد غير المكتملة. تحفظ هذه البيانات في `mahd_trello_task_ui_v1` ضمن localStorage، وهي مؤقتة وغير مشتركة بين المستخدمين والأجهزة.

## الهدف عند إنشاء Supabase الجديد

لا يستبدل Supabase Trello فجأة. يصبح Supabase مالكًا لهوية مَهَد وبيانات مَهَد الخاصة، بينما يبقى Trello تكاملًا خارجيًا يحمل الـ Board/List/Card المرتبطين.

| المجال | مالك البيانات بعد الانتقال | الربط مع Trello |
|---|---|---|
| المستخدمون والجلسات | Supabase Auth وprofiles | Token Trello مفوض ومشفّر/محمي خادميًا |
| العزل | workspaces وworkspace_members | لكل Workspace اتصال Trello اختياري |
| العمل المنظم | projects وproject_members | Project قد يرتبط بـ Board أو أكثر |
| المهمة | tasks في Supabase | external_source وexternal_card_id وexternal_list_id |
| التعاون | comments وmentions وnotifications | تعليق Trello اختياري وليس بديلًا عن تعليق مَهَد |
| القياس | kpi_definitions وkpi_entries | لا يحفظ داخل card descriptions أو custom fields |
| الأتمتة | automation_rules وautomation_logs | أحداث Trello تدخل عبر webhook وتغذي القواعد |
| تتبع المزامنة | integrations وsync_events | cursor/last_synced_at/idempotency/retry |

## الترتيب الآمن للانتقال

### 1. تأسيس المشروع والهوية

ينشأ مشروع Supabase جديد للتطوير، ثم تضاف `profiles`, `workspaces`, `workspace_members` وسياسات RLS. تكون Workspace حد العزل الأعلى كما اعتمد للمشروع. لا ترحّل بطاقات Trello بعد في هذه الخطوة.

### 2. نقل عقد البيانات لا واجهة المستخدم

يضاف `SupabaseTaskProvider` جديد وراء العقد نفسه الذي يستخدمه `useTasks`. يجب أن يعيد نفس نموذج المهمة الظاهر للواجهة، ثم ينقل مصدر `quadrant`, `status`, `duration`, `recurrence` من localStorage إلى جداول مَهَد.

### 3. إدخال Trello كتكامل

تضاف `trello_connections` و`trello_board_links` وحقول المراجع الخارجية. تخزّن tokens في خادم/Edge Function أو secret store؛ لا توضع في localStorage في نسخة الفريق. يستورد Board المحدد مرة واحدة إلى Workspace وProject محددين، مع حفظ external IDs.

### 4. المزامنة أحادية الاتجاه أولًا

تصل Webhooks الموقعة من Trello إلى endpoint خادمي، وتُسجل في `sync_events` مع idempotency key. تُحدّث النسخة المحلية من Task من Trello فقط في البداية. يبقى reconciliation دوري محدود التواتر لاكتشاف الأحداث المفقودة.

### 5. الكتابة المحدودة ثم سياسة التعارض

بعد استقرار القراءة، تفتح كتابة حقول محددة من مَهَد إلى Trello: العنوان والوصف والموعد وحالة القائمة. يجب تثبيت owner لكل حقل وتحديد السلوك عند تعديل الطرفين؛ لا تفتح مزامنة ثنائية كاملة دفعة واحدة.

## بيانات يتعين عدم ترحيلها كحقيقة نهائية

لا تنقل API key أو access token المحفوظين محليًا إلى Git أو إلى جدول قراءة عام. كما لا تعامل مواضع المصفوفة المحلية أو سجلات الجلسة الحالية كبيانات فريق موثوقة؛ بعد إعداد Supabase، تستورد فقط ما يملك تعريفًا صريحًا ومالكية واضحة.

## شروط الانتقال التالية

يناسب بدء Supabase جديد عندما تصبح إحدى هذه الميزات مطلوبة: مستخدمون متعددون في نفس Workspace، مشاركة موثوقة بين الأجهزة، تعليقات وmentions داخل مَهَد، KPIs، أتمتة، تقارير، أو إشعارات خادمية. عندها ينتقل الفريق إلى مرحلة Supabase قبل توسيع Trello-first بمزيد من المنطق المحلي.
