import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export function BackupCodesModal({ open, codes, onClose }: { open: boolean; codes: string[]; onClose: () => void }) {
  function copyCodes() { void navigator.clipboard?.writeText(codes.join('\n')); }
  function downloadCodes() {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'evidence-system-backup-codes.txt'; document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <Modal open={open} title="الرموز الاحتياطية" description="ستظهر هذه الرموز مرة واحدة فقط. احفظها في مكان آمن." onClose={onClose}
      footer={<><Button variant="secondary" onClick={copyCodes}>نسخ</Button><Button variant="secondary" onClick={downloadCodes}>تحميل</Button><Button onClick={onClose}>تم الحفظ</Button></>}>
      <div className="backup-grid">{codes.map((code) => <code key={code}>{code}</code>)}</div>
    </Modal>
  );
}
