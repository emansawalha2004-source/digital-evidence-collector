import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Fingerprint, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/dec-logo.png";

export function Register() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل."); return; }
    if (password !== confirmPassword) { setError("تأكيد كلمة المرور غير مطابق."); return; }
    setLoading(true);
    try {
      const result = await register({ fullName, email, password, confirmPassword });
      if (result.mfaRequired && result.mfaToken) {
        sessionStorage.setItem("mfaToken", result.mfaToken);
        if (result.challengeType) sessionStorage.setItem("mfaChallengeType", result.challengeType);
        if (result.devOtp) sessionStorage.setItem("devOtp", result.devOtp);
        navigate("/mfa-verify", { replace: true });
        return;
      }
      navigate("/", { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : "فشل إنشاء الحساب."); }
    finally { setLoading(false); }
  }

  return (
    <div className="classified-auth-page" dir="rtl">
      <div className="auth-scan-grid" />
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <section className="classified-entry-room register-room">
        <div className="classified-entry-visual">
          <span className="access-label">NEW INVESTIGATOR IDENTITY</span>
          <img className="dec-auth-logo" src={logo} alt="Digital Evidence Collector" />
          <div className="identity-scan compact-scan">
            <div className="scan-ring ring-one" /><div className="scan-ring ring-two" />
            <div className="scan-fingerprint"><UserPlus size={64} /></div><span className="scan-line" />
          </div>
          <h1>تسجيل محقق جديد</h1>
          <p>إنشاء هوية دخول آمنة لمنصة التحقيقات الرقمية. صلاحيات Admin / Investigator تحدد من إدارة النظام.</p>
          <div className="intel-pills"><span><ShieldCheck size={13} /> JWT</span><span><Fingerprint size={13} /> MFA</span><span><Sparkles size={13} /> Audit trail</span></div>
        </div>

        <form className="classified-auth-card" onSubmit={handleSubmit}>
          <div className="auth-card-header"><div className="auth-mark"><UserPlus size={25} /></div><div><span><Sparkles size={14} /> Secure Enrollment</span><h2>إنشاء الحساب</h2></div></div>
          <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Input label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          {error ? <div className="alert error">{error}</div> : null}
          <Button type="submit" fullWidth disabled={loading}>{loading ? "جاري الإنشاء..." : "Create Secure Identity"}</Button>
          <div className="auth-switch"><span>عندك حساب؟</span><Link to="/login">تسجيل الدخول</Link></div>
        </form>
      </section>
    </div>
  );
}
