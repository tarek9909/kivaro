import { create } from 'zustand';

const LANGUAGE_KEY = 'kivaro_language';

const dictionaries = {
  en: {
    'app.name': 'Kivaro',
    'app.tagline': 'ERP Control Room',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.search': 'Search',
    'common.status': 'Status',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.suspended': 'Suspended',
    'common.enabled': 'Enabled',
    'common.disabled': 'Disabled',
    'common.loadingData': 'Loading data...',
    'common.couldNotLoadData': 'Could not load data',
    'common.tryAgain': 'Try again in a moment.',
    'common.nothingToShow': 'Nothing to show yet',
    'pagination.showing': 'Showing {start} to {end} of {total}',
    'pagination.pageOf': 'Page {page} of {totalPages}',
    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'nav.overview': 'Overview',
    'nav.operations': 'Operations',
    'nav.sales': 'Sales and Customers',
    'nav.finance': 'Finance',
    'nav.insights': 'Insights',
    'nav.admin': 'Administration',
    'nav.platform': 'Platform',
    'nav.dashboard': 'Dashboard',
    'nav.inventory': 'Inventory',
    'nav.production': 'Production',
    'nav.purchases': 'Purchases',
    'nav.dispatch': 'Dispatch',
    'nav.customers': 'Customers',
    'nav.locations': 'Locations',
    'nav.commissions': 'Commissions',
    'nav.accounting': 'Accounting',
    'nav.payments': 'Debts and Payments',
    'nav.reports': 'Reports',
    'nav.auditLogs': 'Audit Logs',
    'nav.notifications': 'Notifications',
    'nav.users': 'Users',
    'nav.roles': 'Roles and Permissions',
    'nav.settings': 'Settings',
    'nav.superadmin': 'Superadmin',
    'topbar.openNavigation': 'Open navigation',
    'topbar.searchPlaceholder': 'Search the workspace...',
    'topbar.notifications': 'Notifications',
    'topbar.switchToArabic': 'العربية',
    'topbar.switchToEnglish': 'English',
    'topbar.profile': 'Profile',
    'topbar.signOut': 'Sign out',
    'topbar.guest': 'Guest',
    'topbar.member': 'Member',
    'topbar.exitStore': 'Exit store',
    'topbar.impersonating': 'Viewing {store} as {user}',
    'topbar.backToSuperadmin': 'Superadmin Dashboard',
    'profile.eyebrow': 'Account',
    'profile.title': 'Profile',
    'profile.description': 'Update your account details and password.',
    'profile.details': 'Profile details',
    'profile.password': 'Password',
    'profile.fullName': 'Full name',
    'profile.username': 'Username',
    'profile.email': 'Email',
    'profile.phone': 'Phone',
    'profile.currentPassword': 'Current password',
    'profile.newPassword': 'New password',
    'profile.confirmPassword': 'Confirm password',
    'profile.saveProfile': 'Save profile',
    'profile.savePassword': 'Change password',
    'profile.updated': 'Profile updated',
    'profile.passwordUpdated': 'Password updated',
    'profile.requiredName': 'Full name is required.',
    'profile.invalidEmail': 'Invalid email address.',
    'profile.passwordMin': 'Password must be at least 8 characters.',
    'profile.passwordMismatch': 'Password confirmation does not match.',
    'forbidden.title': "You don't have access to that page",
    'forbidden.description': 'Your current role is missing the permissions required to view this section.',
    'forbidden.back': 'Back to dashboard',
    'roles.eyebrow': 'Administration',
    'roles.title': 'Roles and permissions',
    'roles.description': 'Group permissions into roles and assign them to users.',
    'roles.new': 'New role',
    'roles.permissions': 'Permissions',
    'roles.searchPermissions': 'Search permissions',
    'roles.savePermissions': 'Save permissions',
    'roles.selectedCount': '{count} permissions selected',
    'superadmin.enterStore': 'Enter store',
    'superadmin.editStore': 'Edit store',
    'superadmin.newStore': 'New store',
    'superadmin.storeProfile': 'Store Profile',
    'superadmin.modules': 'Modules',
    'settings.vat': 'VAT'
  },
  ar: {
    'app.name': 'كيفارو',
    'app.tagline': 'غرفة تحكم ERP',
    'common.cancel': 'إلغاء',
    'common.close': 'إغلاق',
    'common.save': 'حفظ',
    'common.search': 'بحث',
    'common.status': 'الحالة',
    'common.active': 'نشط',
    'common.inactive': 'غير نشط',
    'common.suspended': 'موقوف',
    'common.enabled': 'مفعل',
    'common.disabled': 'معطل',
    'common.loadingData': 'جاري تحميل البيانات...',
    'common.couldNotLoadData': 'تعذر تحميل البيانات',
    'common.tryAgain': 'حاول مرة أخرى بعد قليل.',
    'common.nothingToShow': 'لا توجد بيانات بعد',
    'pagination.showing': 'عرض {start} إلى {end} من {total}',
    'pagination.pageOf': 'صفحة {page} من {totalPages}',
    'pagination.previous': 'السابق',
    'pagination.next': 'التالي',
    'nav.overview': 'نظرة عامة',
    'nav.operations': 'العمليات',
    'nav.sales': 'المبيعات والعملاء',
    'nav.finance': 'المالية',
    'nav.insights': 'التقارير والمتابعة',
    'nav.admin': 'الإدارة',
    'nav.platform': 'المنصة',
    'nav.dashboard': 'لوحة التحكم',
    'nav.inventory': 'المخزون',
    'nav.production': 'الإنتاج',
    'nav.purchases': 'المشتريات',
    'nav.dispatch': 'التوزيع',
    'nav.customers': 'العملاء',
    'nav.locations': 'المناطق',
    'nav.commissions': 'العمولات',
    'nav.accounting': 'المحاسبة',
    'nav.payments': 'الديون والمدفوعات',
    'nav.reports': 'التقارير',
    'nav.auditLogs': 'سجل التدقيق',
    'nav.notifications': 'الإشعارات',
    'nav.users': 'المستخدمون',
    'nav.roles': 'الأدوار والصلاحيات',
    'nav.settings': 'الإعدادات',
    'nav.superadmin': 'المشرف العام',
    'topbar.openNavigation': 'فتح التنقل',
    'topbar.searchPlaceholder': 'ابحث في مساحة العمل...',
    'topbar.notifications': 'الإشعارات',
    'topbar.switchToArabic': 'العربية',
    'topbar.switchToEnglish': 'English',
    'topbar.profile': 'الملف الشخصي',
    'topbar.signOut': 'تسجيل الخروج',
    'topbar.guest': 'زائر',
    'topbar.member': 'عضو',
    'topbar.exitStore': 'الخروج من المتجر',
    'topbar.impersonating': 'عرض {store} باسم {user}',
    'topbar.backToSuperadmin': 'العودة للمشرف العام',
    'profile.eyebrow': 'الحساب',
    'profile.title': 'الملف الشخصي',
    'profile.description': 'حدث بيانات حسابك وكلمة المرور.',
    'profile.details': 'بيانات الملف الشخصي',
    'profile.password': 'كلمة المرور',
    'profile.fullName': 'الاسم الكامل',
    'profile.username': 'اسم المستخدم',
    'profile.email': 'البريد الإلكتروني',
    'profile.phone': 'الهاتف',
    'profile.currentPassword': 'كلمة المرور الحالية',
    'profile.newPassword': 'كلمة المرور الجديدة',
    'profile.confirmPassword': 'تأكيد كلمة المرور',
    'profile.saveProfile': 'حفظ الملف',
    'profile.savePassword': 'تغيير كلمة المرور',
    'profile.updated': 'تم تحديث الملف الشخصي',
    'profile.passwordUpdated': 'تم تحديث كلمة المرور',
    'profile.requiredName': 'الاسم الكامل مطلوب.',
    'profile.invalidEmail': 'البريد الإلكتروني غير صالح.',
    'profile.passwordMin': 'يجب أن تكون كلمة المرور 8 أحرف على الأقل.',
    'profile.passwordMismatch': 'تأكيد كلمة المرور غير مطابق.',
    'forbidden.title': 'ليست لديك صلاحية لهذه الصفحة',
    'forbidden.description': 'الدور الحالي لا يملك الصلاحيات المطلوبة لعرض هذا القسم.',
    'forbidden.back': 'العودة إلى لوحة التحكم',
    'roles.eyebrow': 'الإدارة',
    'roles.title': 'الأدوار والصلاحيات',
    'roles.description': 'اجمع الصلاحيات ضمن أدوار وعيّنها للمستخدمين.',
    'roles.new': 'دور جديد',
    'roles.permissions': 'الصلاحيات',
    'roles.searchPermissions': 'بحث في الصلاحيات',
    'roles.savePermissions': 'حفظ الصلاحيات',
    'roles.selectedCount': '{count} صلاحية محددة',
    'superadmin.enterStore': 'الدخول إلى المتجر',
    'superadmin.editStore': 'تعديل المتجر',
    'superadmin.newStore': 'متجر جديد',
    'superadmin.storeProfile': 'ملف المتجر',
    'superadmin.modules': 'الوحدات',
    'settings.vat': 'ضريبة القيمة المضافة'
  }
};

function interpolate(value, params = {}) {
  return Object.entries(params).reduce(
    (text, [key, replacement]) => text.replaceAll(`{${key}}`, replacement),
    value
  );
}

function readInitialLanguage() {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(LANGUAGE_KEY) === 'ar' ? 'ar' : 'en';
}

export const useLanguageStore = create((set, get) => ({
  language: readInitialLanguage(),
  setLanguage(language) {
    const next = language === 'ar' ? 'ar' : 'en';
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    }
    set({ language: next });
  },
  toggleLanguage() {
    get().setLanguage(get().language === 'ar' ? 'en' : 'ar');
  }
}));

export function translate(language, key, params) {
  const dictionary = dictionaries[language] || dictionaries.en;
  return interpolate(dictionary[key] || dictionaries.en[key] || key, params);
}

export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  return {
    language,
    dir: language === 'ar' ? 'rtl' : 'ltr',
    t: (key, params) => translate(language, key, params)
  };
}

