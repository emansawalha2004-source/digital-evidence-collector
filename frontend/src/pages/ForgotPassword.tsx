import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { KeyRound, LockKeyhole, MailCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { authApi } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/dec-logo.png";

export function ForgotPassword() {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null); setSuccess(null); setDevOtp(null);
    try {
      const result = await authApi.forgotPassword({ email });
      setSuccess(result.message || "تم إرسال رمز إعادة التعيين إذا كان البريد مسجلاً.");
      if (result.devOtp) setDevOtp(result.devOtp);
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إرسال رمز إعادة التعيين.");
    } finally { setLoading(false); }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    setError(null); setSuccess(null);
    if (newPassword !== confirmPassword) { setError("تأكيد كلمة المرور غير مطابق."); return; }
    setLoading(true);
    try {
      const result = await authApi.resetPassword({ email, code, newPassword, confirmPassword });
      setSuccess(result.message || "تم تغيير كلمة المرور بنجاح.");
      setCode(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تغيير كلمة المرور.");
    } finally { setLoading(false); }
  }

  return (
    <div className="classified-auth-page" dir="rtl">
      <div className="auth-scan-grid" />
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <section className="classified-entry-room register-room">
        <div className="classified-entry-visual auth-logo-panel">
          <span className="access-label">PASSWORD RECOVERY CENTER</span>
          <img className="dec-auth-logo" src={logo} alt="Digital Evidence Collector" />
          <div className="identity-scan compact-scan">
            <div className="scan-ring ring-one" /><div className="scan-ring ring-two" />
            <div className="scan-fingerprint"><KeyRound size={64} /></div><span className="scan-line" />
          </div>
          <h1>استعادة كلمة المرور</h1>
          <p>أدخل البريد الإلكتروني، ثم ضع رمز التحقق وكلمة المرور الجديدة لإعادة فتح حسابك بأمان.</p>
          <div className="intel-pills"><span><MailCheck size={13} /> Email OTP</span><span><LockKeyhole size={13} /> Secure reset</span><span><ShieldCheck size={13} /> Audit logged</span></div>
        </div>

        <form className="classified-auth-card" onSubmit={step === "request" ? requestCode : resetPassword}>
          <div className="auth-card-header"><div className="auth-mark"><KeyRound size={25} /></div><div><span><Sparkles size={14} /> Account Recovery</span><h2>هل نسيت كلمة المرور؟</h2></div></div>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="name@example.com" />
          {step === "reset" ? (
            <>
              <Input label="Reset Code" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="123456" />
              <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Aa@123456" />
              <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Aa@123456" />
            </>
          ) : null}
          {devOtp ? <div className="otp-dev-box"><span>DEV OTP</span><strong>{devOtp}</strong><small>للتجربة المحلية فقط</small></div> : null}
          {error ? <div className="alert error">{error}</div> : null}
          {success ? <div className="alert success">{success}</div> : null}
          <Button type="submit" fullWidth disabled={loading}>{loading ? "جاري المعالجة..." : step === "request" ? "Send Reset Code" : "Reset Password"}</Button>
          {step === "reset" ? <Button type="button" variant="ghost" fullWidth onClick={() => setStep("request")}>إرسال رمز جديد</Button> : null}
          <div className="auth-switch"><span>تذكر كلمة المرور؟</span><Link to="/login">تسجيل الدخول</Link></div>
        </form>
      </section>
    </div>
  );
}
