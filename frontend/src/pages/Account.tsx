import { FormEvent, useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/common/Card';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import { MfaSetupModal } from '../components/auth/MfaSetupModal';
import { BackupCodesModal } from '../components/auth/BackupCodesModal';

export function Account() {
  const { user, refreshUser } = useAuth();
  const [setupOpen, setSetupOpen] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaPassword, setMfaPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null); setMessage(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage('تم تغيير كلمة المرور.');
    } catch (err) { setError(err instanceof Error ? err.message : 'فشل تغيير كلمة المرور.'); }
    finally { setLoading(false); }
  }

  async function disableMfa() {
    setLoading(true); setError(null); setMessage(null);
    try { await authApi.disableMfa({ password: mfaPassword, code: mfaCode }); setMfaPassword(''); setMfaCode(''); await refreshUser(); setMessage('تم تعطيل التحقق بخطوتين.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'فشل تعطيل التحقق بخطوتين.'); }
    finally { setLoading(false); }
  }

  async function regenerateCodes() {
    setLoading(true); setError(null); setMessage(null);
    try { const result = await authApi.regenerateBackupCodes({ password: mfaPassword, code: mfaCode }); setBackupCodes(result.backupCodes); setMfaPassword(''); setMfaCode(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'فشل توليد الرموز الاحتياطية.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="page-stack">
      <PageHeader title="الحساب" description="إدارة بيانات الحساب والأمان والتحقق بخطوتين." />
      {message ? <div className="alert success">{message}</div> : null}
      {error ? <div className="alert error">{error}</div> : null}

      <Card>
        <CardHeader><h2>الملف الشخصي</h2></CardHeader>
        <CardBody>
          <div className="details-grid">
            <span>الاسم</span><strong>{user?.fullName || user?.name || 'N/A'}</strong>
            <span>البريد</span><strong>{user?.email || 'N/A'}</strong>
            <span>الدور</span><strong><Badge>{user?.role || 'N/A'}</Badge></strong>
            <span>الحالة</span><strong>{user?.isActive === false ? 'غير فعال' : 'فعال'}</strong>
            <span>MFA</span><strong><Badge tone={user?.mfaEnabled ? 'success' : 'warning'}>{user?.mfaEnabled ? 'مفعل' : 'غير مفعل'}</Badge></strong>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2>تغيير كلمة المرور</h2></CardHeader>
        <CardBody>
          <form className="form-grid" onSubmit={changePassword}>
            <Input label="كلمة المرور الحالية" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            <Input label="كلمة المرور الجديدة" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <Input label="تأكيد كلمة المرور" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <Button type="submit" disabled={loading}>حفظ كلمة المرور</Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2>التحقق بخطوتين</h2></CardHeader>
        <CardBody className="page-stack">
          <p className="muted">لا تحفظ أسرار MFA في لقطات شاشة أو محادثات. الرموز الاحتياطية تظهر مرة واحدة فقط.</p>
          {!user?.mfaEnabled ? (
            <Button onClick={() => setSetupOpen(true)}>تفعيل التحقق بخطوتين</Button>
          ) : (
            <div className="form-grid">
              <Input label="كلمة المرور" type="password" value={mfaPassword} onChange={(e) => setMfaPassword(e.target.value)} />
              <Input label="رمز MFA أو رمز احتياطي" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} />
              <div className="actions-row"><Button variant="danger" onClick={disableMfa} disabled={loading}>تعطيل التحقق بخطوتين</Button><Button variant="secondary" onClick={regenerateCodes} disabled={loading}>توليد رموز احتياطية جديدة</Button></div>
            </div>
          )}
        </CardBody>
      </Card>

      <MfaSetupModal open={setupOpen} onClose={() => setSetupOpen(false)} onEnabled={(codes) => { setBackupCodes(codes); void refreshUser(); }} />
      <BackupCodesModal open={backupCodes.length > 0} codes={backupCodes} onClose={() => setBackupCodes([])} />
    </div>
  );
}
