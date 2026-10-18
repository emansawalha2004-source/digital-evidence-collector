import { FormEvent, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { useAuth } from "../context/AuthContext";

export function MfaVerify() {
  const { verifyLoginMfa, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string } | null)?.from || "/";
  const mfaToken = useMemo(() => sessionStorage.getItem("mfaToken") || "", []);
  const challengeType = useMemo(
    () => sessionStorage.getItem("mfaChallengeType") || "otp",
    []
  );

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to={from} replace />;
  if (!mfaToken) return <Navigate to="/login" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await verifyLoginMfa({ mfaToken, code });

      sessionStorage.removeItem("mfaToken");
      sessionStorage.removeItem("mfaChallengeType");
      sessionStorage.removeItem("devOtp");

      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "رمز التحقق غير صحيح.");
    } finally {
      setLoading(false);
    }
  }

  const isTotp = challengeType === "totp";

  return (
    <div className="classified-auth-page" dir="rtl">
      <div className="auth-scan-grid" />
      <div className="auth-orb auth-orb-a" />
      <div className="auth-orb auth-orb-b" />

      <section className="classified-entry-room mfa-room">
        <div className="classified-entry-visual">
          <span className="access-label">SECOND SECURITY GATE</span>

          <div className="identity-scan compact-scan">
            <div className="scan-ring ring-one" />
            <div className="scan-ring ring-two" />
            <div className="scan-fingerprint">
              <KeyRound size={64} />
            </div>
            <span className="scan-line" />
          </div>

          <h1>{isTotp ? "Authenticator Verification" : "OTP Verification"}</h1>

          <p>
            طبقة تحقق إضافية قبل فتح غرفة التحقيق، لحماية الأدلة والتقارير من
            الوصول غير المصرح.
          </p>

          <div className="intel-pills">
            <span>
              <LockKeyhole size={13} /> Time locked
            </span>
            <span>
              <TimerReset size={13} /> Session proof
            </span>
            <span>
              <Fingerprint size={13} /> Identity signal
            </span>
          </div>
        </div>

        <form className="classified-auth-card" onSubmit={handleSubmit}>
          <div className="auth-card-header">
            <div className="auth-mark">
              <ShieldCheck size={25} />
            </div>

            <div>
              <span>
                <Sparkles size={14} /> Verify Identity
              </span>
              <h2>رمز التحقق</h2>
            </div>
          </div>

          <Input
            label={isTotp ? "Authenticator / Backup Code" : "Verification Code"}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoFocus
            inputMode="numeric"
            placeholder="000000"
          />

          {error ? <div className="alert error">{error}</div> : null}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "جاري التحقق..." : "Verify & Enter"}
          </Button>

          <div className="auth-switch">
            <span>حساب مختلف؟</span>
            <Link to="/login">رجوع للدخول</Link>
          </div>
        </form>
      </section>
    </div>
  );
}