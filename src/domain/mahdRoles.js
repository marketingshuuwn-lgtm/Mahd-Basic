export const AGENCY_ROLES = [
  { id: 'owner', name: 'المالك', category: 'leadership', description: 'مسؤول القرار النهائي ومساحة العمل والسياسات.' },
  { id: 'account_manager', name: 'مدير الحساب', category: 'client', description: 'يحافظ على سياق العميل ويتابع التواصل والاعتمادات.' },
  { id: 'content_writer', name: 'كاتب محتوى', category: 'production', description: 'ينتج النصوص والمحتوى التحريري ضمن المشروع.' },
  { id: 'designer', name: 'مصمم', category: 'production', description: 'ينتج المخرجات والتصاميم البصرية.' },
  { id: 'photographer', name: 'مصور', category: 'production', description: 'ينفذ مخرجات التصوير والمواد المرئية.' },
  { id: 'media_manager', name: 'مسؤول ميديا', category: 'distribution', description: 'يدير النشر والتوزيع ومتابعة القنوات.' },
  { id: 'project_coordinator', name: 'منسق مشاريع', category: 'operations', description: 'ينسق التدفق والمواعيد والاعتمادات بين الأطراف.' },
  { id: 'project_manager', name: 'مدير مشاريع', category: 'operations', description: 'يدير نطاق المشروع وأولوياته ومخاطره وتسليمه.' },
  { id: 'campaign_executor', name: 'منفذ حملات', category: 'distribution', description: 'ينفذ إعدادات الحملات ومتابعة تشغيلها ونتائجها.' },
];

export const ROLE_IDS = AGENCY_ROLES.map((role) => role.id);

export function getAgencyRole(roleId) {
  return AGENCY_ROLES.find((role) => role.id === roleId) || null;
}

export function isKnownAgencyRole(roleId) {
  return ROLE_IDS.includes(roleId);
}

export function describeRoleBoundary() {
  return {
    roleCount: AGENCY_ROLES.length,
    roles: ROLE_IDS,
    permissionsStatus: 'not-finalized',
    note: 'قاموس الأدوار مثبت من سياق التشغيل، لكن مصفوفة الصلاحيات النهائية تحتاج اعتمادًا منتجيًا منفصلًا.',
  };
}
