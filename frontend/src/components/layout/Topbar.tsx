import { Link, useNavigate } from "react-router-dom";
import { Activity, Languages, LogOut, RadioTower, UserCircle } from "lucide-react";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export function Topbar() {
  const { user, logout } = useAuth();
  const { lang, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="classified-topbar">
      <div className="topbar-title">
        <span className="eyebrow"><RadioTower size={14} /> </span>
        <h1> Digital Evidence Collector</h1>
      </div>

      <div className="topbar-actions">
        <div className="live-chip"><Activity size={14} /> Live Case Monitoring</div>
        <Link to="/account" className="user-chip">
          <UserCircle size={18} />
          <span>{user?.fullName || user?.name || user?.email || "مستخدم"}</span>
          <Badge>{user?.role || "viewer"}</Badge>
          <Badge tone={user?.mfaEnabled ? "success" : "warning"}>{user?.mfaEnabled ? "MFA Active" : "MFA Off"}</Badge>
        </Link>
        <Button variant="secondary" onClick={toggleLanguage}>
          <Languages size={16} /> {lang === "ar" ? "EN" : "AR"}
        </Button>
        <Button variant="secondary" onClick={handleLogout}><LogOut size={16} /> {lang === "ar" ? "خروج" : "Logout"}</Button>
      </div>
    </header>
  );
}
