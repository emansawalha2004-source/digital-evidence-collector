#!/bin/bash
# سكريبت تشغيل نظام إدارة الأدلة الرقمية
# Digital Evidence System - Quick Start Script

set -e

echo "======================================"
echo "  نظام إدارة الأدلة الرقمية"
echo "  Digital Evidence Management System"
echo "======================================"
echo ""

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ خطأ: Node.js غير مثبت. يرجى تثبيت Node.js 20 أو أحدث."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  تحذير: Node.js $NODE_VERSION قديم. يُنصح باستخدام Node.js 20+"
fi

# التحقق من وجود MongoDB
if ! command -v mongod &> /dev/null && ! mongosh --eval "db.adminCommand('ping')" &> /dev/null 2>&1; then
    echo "⚠️  تحذير: تأكد من تشغيل MongoDB قبل المتابعة."
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📦 تثبيت اعتماديات الباك اند..."
cd "$SCRIPT_DIR/backend"
npm install --silent

echo "📦 تثبيت اعتماديات الفرونت اند..."
cd "$SCRIPT_DIR/frontend"
npm install --silent

echo ""
echo "🌱 تهيئة قاعدة البيانات بالبيانات الأولية..."
cd "$SCRIPT_DIR/backend"
npm run seed

echo ""
echo "✅ تم التثبيت بنجاح!"
echo ""
echo "لتشغيل المشروع، افتح terminal-ين:"
echo ""
echo "  Terminal 1 (الباك اند):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (الفرونت اند):"
echo "    cd frontend && npm run dev"
echo ""
echo "روابط المشروع:"
echo "  🌐 الفرونت اند: http://localhost:5173"
echo "  🔌 الباك اند:   http://localhost:5000/api"
echo ""
echo "حسابات الاختبار:"
echo "  👤 مدير:   admin@evidence.local / Admin@123456"
echo "  🔍 محقق:   investigator@evidence.local / Investigator@123456"
echo "  👁️  مشاهد:  viewer@evidence.local / Viewer@123456"
echo "  📋 مدقق:   auditor@evidence.local / Auditor@123456"
echo ""
