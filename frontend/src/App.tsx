import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { Account } from "./pages/Account";
import { ArchivedEvidence } from "./pages/ArchivedEvidence";
import { CaseDetails } from "./pages/CaseDetails";
import { Cases } from "./pages/Cases";
import { Dashboard } from "./pages/Dashboard";
import { EvidencePage } from "./pages/Evidence";
import { EvidenceDetails } from "./pages/EvidenceDetails";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { MfaVerify } from "./pages/MfaVerify";
import { NotFound } from "./pages/NotFound";
import { Register } from "./pages/Register";
import { Reports } from "./pages/Reports";
import { Timeline } from "./pages/Timeline";
import { UploadEvidence } from "./pages/UploadEvidence";
import { Users } from "./pages/Users";
import { RoleGate } from "./components/auth/RoleGate";

export function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="mfa-verify" element={<MfaVerify />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="cases" element={<Cases />} />
          <Route path="cases/new" element={<RoleGate roles={["investigator"]} fallback={<Navigate to="/cases" replace />}><Cases openCreateByDefault /></RoleGate>} />
          <Route path="cases/create" element={<RoleGate roles={["investigator"]} fallback={<Navigate to="/cases" replace />}><Cases openCreateByDefault /></RoleGate>} />
          <Route path="cases/:id" element={<CaseDetails />} />
          <Route path="evidence" element={<EvidencePage />} />
          <Route path="evidence/:id" element={<EvidenceDetails />} />
          <Route path="upload" element={<RoleGate roles={["investigator"]} fallback={<Navigate to="/" replace />}><UploadEvidence /></RoleGate>} />
          <Route path="archived" element={<RoleGate roles={["admin"]} fallback={<Navigate to="/" replace />}><ArchivedEvidence /></RoleGate>} />
          <Route path="timeline" element={<RoleGate roles={["admin"]} fallback={<Navigate to="/" replace />}><Timeline /></RoleGate>} />
          <Route path="reports" element={<RoleGate roles={["investigator"]} fallback={<Navigate to="/" replace />}><Reports /></RoleGate>} />
          <Route path="analysis" element={<Navigate to="/" replace />} />
          <Route path="users" element={<RoleGate roles={["admin"]} fallback={<Navigate to="/" replace />}><Users /></RoleGate>} />
          <Route path="account" element={<Account />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
