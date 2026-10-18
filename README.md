# نظام إدارة الأدلة الرقمية
## Digital Evidence Management System

نظام متكامل لإدارة الأدلة الرقمية في قضايا الجرائم الإلكترونية، مبني بـ Node.js/Express/MongoDB في الباك اند و React/TypeScript/Vite في الفرونت اند.

---

## المتطلبات

- **Node.js** 20 أو أحدث
- **MongoDB** يعمل محلياً أو URI صالح
- **npm** أو **yarn**

---

## التثبيت السريع

### 1. تثبيت الاعتماديات

```bash
# تثبيت اعتماديات الباك اند
cd backend
npm install

# تثبيت اعتماديات الفرونت اند
cd ../frontend
npm install
```

### 2. إعداد ملفات البيئة

ملف `.env` للباك اند موجود مسبقاً في `backend/.env`. تأكد من تعديل:
- `MONGO_URI` - رابط قاعدة البيانات
- `JWT_SECRET` - مفتاح سري قوي
- إعدادات SMTP إذا أردت إرسال OTP عبر البريد الإلكتروني

ملف `.env` للفرونت اند موجود في `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. تهيئة قاعدة البيانات (Seed)

```bash
cd backend
npm run seed
```

### 4. تشغيل المشروع

**تشغيل الباك اند:**
```bash
cd backend
npm run dev
```

**تشغيل الفرونت اند (في terminal آخر):**
```bash
cd frontend
npm run dev
```

---

## حسابات الاختبار

| الدور | البريد الإلكتروني | كلمة المرور |
|---|---|---|
| مدير النظام | admin@evidence.local | Admin@123456 |
| محقق | investigator@evidence.local | Investigator@123456 |
| مشاهد | viewer@evidence.local | Viewer@123456 |
| مدقق | auditor@evidence.local | Auditor@123456 |

> **ملاحظة:** عند تفعيل OTP، سيظهر الرمز في console الباك اند (عند ضبط `OTP_SHOW_DEV_CODE=true`).

---

## روابط المشروع

- **الفرونت اند:** http://localhost:5173
- **الباك اند API:** http://localhost:5000/api
- **فحص الصحة:** http://localhost:5000/api/health

---

## هيكل المشروع

```
EvidenceSystem/
├── backend/                 # Node.js + Express + MongoDB
│   ├── controllers/         # منطق المعالجة
│   ├── models/              # نماذج MongoDB
│   ├── routes/              # مسارات API
│   ├── middlewares/         # الوسطاء
│   ├── utils/               # أدوات مساعدة
│   ├── scripts/             # سكريبت البذر
│   ├── .env                 # متغيرات البيئة
│   └── server.js            # نقطة الدخول
├── frontend/                # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/             # طبقة API
│   │   ├── components/      # المكونات
│   │   ├── context/         # React Context
│   │   ├── hooks/           # Custom Hooks
│   │   ├── pages/           # الصفحات
│   │   ├── styles/          # CSS
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # أدوات مساعدة
│   ├── .env                 # متغيرات البيئة
│   └── vite.config.ts       # إعدادات Vite
├── storage/
│   ├── uploads/             # ملفات الأدلة المرفوعة
│   └── reports/             # التقارير PDF المولدة
└── README.md
```

---

## API Endpoints

### المصادقة `/api/auth`
| Method | Endpoint | الوصف |
|---|---|---|
| POST | `/login` | تسجيل الدخول |
| POST | `/register` | إنشاء حساب |
| POST | `/logout` | تسجيل الخروج |
| GET | `/me` | بيانات المستخدم الحالي |
| PUT | `/change-password` | تغيير كلمة المرور |
| POST | `/mfa/setup` | إعداد MFA |
| POST | `/mfa/verify` | التحقق من MFA |
| POST | `/mfa/disable` | تعطيل MFA |

### القضايا `/api/cases`
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/` | قائمة القضايا |
| POST | `/` | إنشاء قضية |
| GET | `/:id` | تفاصيل قضية |
| PUT | `/:id` | تحديث قضية |
| DELETE | `/:id` | أرشفة قضية |
| GET | `/:id/evidence` | أدلة القضية |
| GET | `/:id/timeline` | سجل القضية |
| GET | `/:id/stats` | إحصائيات القضية |

### الأدلة `/api/evidence`
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/` | قائمة الأدلة |
| POST | `/` | إنشاء دليل نصي/رابط |
| POST | `/upload` | رفع ملف دليل |
| GET | `/stats` | إحصائيات الأدلة |
| GET | `/archived` | الأدلة المؤرشفة |
| GET | `/:id` | تفاصيل دليل |
| PUT | `/:id` | تحديث دليل |
| POST | `/:id/archive` | أرشفة دليل |
| POST | `/:id/restore` | استعادة دليل |
| POST | `/:id/notes` | إضافة ملاحظة |
| GET | `/:id/download` | تحميل ملف |
| GET | `/:id/preview` | معاينة ملف |
| POST | `/:id/verify` | التحقق من التكامل |

### لوحة التحكم `/api/dashboard`
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/` | إحصائيات عامة |

### السجل الزمني `/api/timeline`
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/` | قائمة الأحداث |

### التقارير `/api/reports`
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/` | قائمة التقارير |
| POST | `/case/:id` | توليد تقرير قضية |
| POST | `/evidence/:id` | توليد تقرير دليل |
| GET | `/download/:filename` | تحميل تقرير |

### التحليل `/api/analysis`
| Method | Endpoint | الوصف |
|---|---|---|
| POST | `/text` | تحليل نص |
| POST | `/link` | تحليل رابط |
| POST | `/evidence/:id` | تحليل دليل |
| GET | `/evidence/:id/history` | سجل التحليل |

### المستخدمون `/api/users` (مدير فقط)
| Method | Endpoint | الوصف |
|---|---|---|
| GET | `/` | قائمة المستخدمين |
| GET | `/:id` | تفاصيل مستخدم |
| PUT | `/:id/role` | تغيير الدور |
| PUT | `/:id/status` | تغيير الحالة |

---

## الأدوار والصلاحيات

| الصلاحية | مدير | محقق | مدقق | مشاهد |
|---|---|---|---|---|
| إنشاء/تعديل قضية | ✅ | ✅ | ❌ | ❌ |
| رفع/تعديل دليل | ✅ | ✅ | ❌ | ❌ |
| أرشفة/استعادة دليل | ✅ | ✅ | ❌ | ❌ |
| التحقق من التكامل | ✅ | ✅ | ✅ | ❌ |
| توليد تقارير | ✅ | ✅ | ❌ | ❌ |
| تحليل الأدلة | ✅ | ✅ | ❌ | ❌ |
| إدارة المستخدمين | ✅ | ❌ | ❌ | ❌ |
| عرض القضايا والأدلة | ✅ | ✅ | ✅ | ✅ |
