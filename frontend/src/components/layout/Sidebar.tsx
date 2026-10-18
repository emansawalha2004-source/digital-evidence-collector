import { NavLink } from "react-router-dom";
import {
  Archive,
  BarChart3,
  BrainCircuit,
  Clock3,
  FileText,
  FolderOpen,
  FolderPlus,
  ShieldCheck,
  Upload,
  Users
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/dec-logo.png";

const navItems = [
  { label: "Command Room", ar: "غرفة القيادة", path: "/", icon: BarChart3, roles: ["admin"] },
  { label: "Case Registry", ar:"سجل البلاغات", path: "/cases", icon: FolderOpen, roles: ["admin"] },
  { label: "Create Case", ar: "إنشاء بلاغ", path: "/cases/new", icon: FolderPlus, roles: ["investigator"] },
  { label: "Upload Evidence", ar: "رفع دليل", path: "/upload", icon: Upload, roles: ["investigator"] },
  { label: "Forensic Reports", ar: "التقارير", path: "/reports", icon: FileText, roles: ["investigator"] },
  { label: "Evidence Vault", ar: "خزنة الأدلة", path: "/evidence", icon: FileText, roles: ["admin"] },
  { label: "Cold Archive", ar: "الأرشيف", path: "/archived", icon: Archive, roles: ["admin"] },
  { label: "Investigation Timeline", ar: "السجل الزمني", path: "/timeline", icon: Clock3, roles: ["admin"] },
  { label: "Access Control", ar: "المستخدمون", path: "/users", icon: Users, roles: ["admin"] }
];

export function Sidebar() {
  const { user } = useAuth();
  const role = user?.role || "viewer";
  const visibleItems = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="classified-sidebar">
      <div className="sidebar-brand classified-brand">
        <img className="sidebar-logo" src={logo} alt="Digital Evidence Collector" />
        <div>
          <strong>DEC Platform</strong>
          <span>Digital Evidence Collector</span>
        </div>
      </div>

      <div className="sidebar-intel-card">
        {role === "admin" ? <BrainCircuit size={18} /> : <ShieldCheck size={18} />}
        <div>
          <strong>{role === "admin" ? "Admin Intelligence" : "User Intake"}</strong>
          <span>{role === "admin" ? "Cases · Evidence · Timeline" : "Create cases · Upload evidence · Reports"}</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} end={item.path === "/"} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`.trim()}>
              <Icon size={18} />
              <span><b>{item.label}</b><small>{item.ar}</small></span>
            </NavLink>
          );
        })}
      </nav>

      <div className="classified-footer-stamp">
        <span>SECURE ACCESS</span>
        <strong>{role === "admin" ? "ADMIN / OVERSIGHT" : "USER / REPORTS"}</strong>
      </div>
    </aside>
  );
}
