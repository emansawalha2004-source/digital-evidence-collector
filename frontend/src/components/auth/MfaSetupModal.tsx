import { FormEvent, useEffect, useState } from 'react';
import { authApi, type MfaSetupResponse } from '../../api/authApi';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';

export function MfaSetupModal({ open, onClose, onEnabled }: { open: boolean; onClose: () => void; onEnabled: (codes: string[]) => void }) {
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setError(null); setCode('');
    authApi.setupMfa().then(setSetup).catch((err) => setError(err instanceof Error ? err.message : 'فشل بدء التحقق بخطوتين.')).finally(() => setLoading(false));
  }, [open]);

  async function handleVerify(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try { const result = await authApi.verifyMfaSetup({ code }); onEnabled(result.backupCodes); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'رمز التحقق غير صحيح.'); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} title="تفعيل التحقق بخطوتين" description="امسح رمز QR بتطبيق Google Authenticator أو Microsoft Authenticator." onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>إلغاء</Button><Button type="submit" form="mfa-setup-form" disabled={loading}>تفعيل</Button></>}>
      <form id="mfa-setup-form" className="page-stack" onSubmit={handleVerify}>
        {setup ? <><img className="mfa-qr" src={setup.qrCodeDataUrl} alt="MFA QR" /><div className="manual-key"><span>المفتاح اليدوي</span><code>{setup.manualEntryKey}</code></div></> : null}
        <Input label="رمز التطبيق" value={code} onChange={(e) => setCode(e.target.value)} required />
        {error ? <div className="alert error">{error}</div> : null}
      </form>
    </Modal>
  );
}
