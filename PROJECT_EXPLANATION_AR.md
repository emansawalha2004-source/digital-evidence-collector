# شرح مشروع EvidenceSystem للدكتور

## فكرة المشروع
المشروع عبارة عن منصة رسمية لإدارة الأدلة الرقمية في قضايا الجرائم الإلكترونية. النظام يسمح للمحقق أو الأدمن بإنشاء قضايا، رفع أدلة رقمية، حفظ الملفات، تتبع الأحداث، تحليل روابط أو نصوص مشبوهة، وإصدار تقارير PDF.

## هيكلة المشروع
```txt
EvidenceSystem/
├─ backend/              Express + MongoDB API
│  ├─ controllers/       منطق العمليات مثل الأدلة والقضايا والتقارير
│  ├─ models/            MongoDB Schemas
│  ├─ routes/            روابط الـ API
│  ├─ middlewares/       حماية JWT، رفع الملفات، معالجة الأخطاء
│  ├─ utils/             أدوات مساعدة: hash, reports, audit logs
│  └─ server.js          نقطة تشغيل الباك إند
├─ frontend/             React + TypeScript + Vite
│  ├─ src/api/           ربط الفرونت مع الباك
│  ├─ src/pages/         صفحات النظام
│  ├─ src/components/    مكونات مشتركة
│  └─ src/styles/        تصميم حكومي رسمي
├─ API_ENDPOINTS.md      كل روابط الـ API
├─ INSTALL_WINDOWS.bat   تثبيت الحزم على ويندوز
└─ RUN_WINDOWS.bat       تشغيل الفرونت والباك معاً
```

## الربط بين Frontend و Backend
الفرونت يستخدم الملف:

```txt
frontend/src/api/client.ts
```

وقيمة الرابط موجودة في:

```txt
frontend/.env
VITE_API_BASE_URL=http://localhost:5000/api
```

يعني أي طلب من الواجهة يذهب إلى الباك إند على:

```txt
http://localhost:5000/api
```

## التصميم الحكومي
تم تعديل الألوان إلى طابع رسمي قريب من المواقع الحكومية الأردنية:
- كحلي رسمي للـ sidebar والـ headers.
- ذهبي للتفاصيل والهوية الرسمية.
- أبيض للخلفيات والبطاقات.
- أحمر للأزرار الخطيرة مثل الأرشفة والحذف.

## طريقة التشغيل أمام الدكتور
1. شغلي MongoDB.
2. افتحي فولدر المشروع.
3. أول مرة فقط شغلي:

```txt
INSTALL_WINDOWS.bat
```

4. بعدها شغلي:

```txt
RUN_WINDOWS.bat
```

5. افتحي الموقع:

```txt
http://localhost:5173
```

6. لفحص الباك:

```txt
http://localhost:5000/api/health
```

## بيانات تجريبية
لتعبئة الداتا بيس ببيانات جاهزة:

```bash
cd backend
npm run seed
```

حسابات الدخول بعد الـ seed:

```txt
Admin: admin@evidence.local / Admin@123456
Investigator: investigator@evidence.local / Investigator@123456
Viewer: viewer@evidence.local / Viewer@123456
Auditor: auditor@evidence.local / Auditor@123456
```

ملاحظة: في وضع التطوير يظهر OTP داخل صفحة تسجيل الدخول لأن `OTP_SHOW_DEV_CODE=true`.

## أهم الميزات
- Authentication + JWT.
- OTP/MFA verification.
- Role Based Access Control.
- Case Management.
- Evidence Upload and Archiving.
- SHA-256 integrity verification.
- Audit timeline.
- Reports PDF.
- Analysis for text/link/evidence.
- Professional government-style UI.
