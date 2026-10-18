# Digital Evidence System - Classified Investigation Suite

تم إعادة تصميم الواجهة لتظهر كأنها غرفة تحقيق رقمية سرية مخصصة للأدلة الرقمية والتحقيقات السيبرانية.

## ما تم إضافته
- تصميم احترافي غامض يشبه أنظمة التحقيق والشركات الأمنية.
- Dashboard باسم Investigation Room يحتوي Threat Score و Case Map وإحصائيات البلاغات والأدلة.
- AURA Investigation Copilot كـ Chatbot أساسي في يمين الشاشة.
- صفحات Login / Register / OTP بنفس هوية غرفة التحقيق.
- كل صفحات المشروع الأصلية بقيت موجودة: Cases, Evidence, Upload, Reports, Timeline, Analysis, Users, Account.
- تحسين تحميل التقارير PDF.
- تحسين CORS لبورتات Vite الشائعة.

## التشغيل
```bash
npm install --prefix backend
npm install --prefix frontend
```

Backend:
```bash
cd backend
npm start
```

Frontend:
```bash
cd frontend
npm run dev -- --port 5173
```
