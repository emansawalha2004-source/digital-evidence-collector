import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Fingerprint, LockKeyhole, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/dec-logo.png";
import { useLanguage } from "../context/LanguageContext";

export function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, toggleLanguage } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";

  if (isAuthenticated) return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null);
    try {
      const result = await login({ email, password });
      if (result.mfaRequired && result.mfaToken) {
        sessionStorage.setItem("mfaToken", result.mfaToken);
        if (result.challengeType) sessionStorage.setItem("mfaChallengeType", result.challengeType);
        if (result.devOtp) sessionStorage.setItem("devOtp", result.devOtp);
        navigate("/mfa-verify", { replace: true, state: { from } });
        return;
      }
      navigate(from, { replace: true });
    } catch (err) { setError(err instanceof Error ? err.message : "فشل تسجيل الدخول."); }
    finally { setLoading(false); }
  }

  return (
    <div className="classified-auth-page" dir="rtl">
    
      <div className="auth-scan-grid" />
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <section className="classified-entry-room">
        <div className="classified-entry-visual">
          <span className="access-label">CLASSIFIED DIGITAL EVIDENCE UNIT</span>
          <img className="dec-auth-logo" src={logo} alt="Digital Evidence Collector" />
          <div className="identity-scan">
            <div className="scan-ring ring-one" />
            <div className="scan-ring ring-two" />
            <div className="scan-fingerprint"><Fingerprint size={72} /></div>
            <span className="scan-line" />
          </div>
          <h1>Digital Evidence Collector Platform</h1>
          <p>Advanced government-grade platform for managing digital evidence,
  cybercrime investigations, chain of custody documentation,
  and forensic intelligence reporting</p>
          <div className="intel-pills"><span><Radar size={13} /> Live cases</span><span><ShieldCheck size={13} /> Hash integrity</span><span><LockKeyhole size={13} /> MFA secure</span></div>
        </div>

        <form className="classified-auth-card" onSubmit={handleSubmit}>
          <div className="auth-card-header">
            <div className="auth-mark"><ShieldCheck size={25} /></div>
            <div><span><Sparkles size={14} /> Secure Access Gate</span><h2>تسجيل الدخول</h2></div>
          </div>

          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@test.com" />
          <div className="password-row auth-password-row">
            <Input label="Password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            <Button variant="ghost" onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</Button>
          </div>
          <div className="forgot-password-line"><Link to="/forgot-password">هل نسيت كلمة المرور؟</Link></div>
          {error ? <div className="alert error">{error}</div> : null}
          <Button type="submit" fullWidth disabled={loading}>{loading ? "جاري التحقق..." : "Enter Investigation Room"}</Button>
          <div className="auth-switch"><span>ما عندك حساب؟</span><Link to="/register">إنشاء حساب</Link></div>
        </form>
      </section>
    </div>
  );
}
