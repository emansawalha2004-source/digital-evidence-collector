import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AuraCopilot } from "./AuraCopilot";

export function AppLayout() {
  return (
    <div className="classified-shell">
      <div className="classified-background" aria-hidden="true">
        <span className="scan-grid" />
        <span className="room-light room-light-a" />
        <span className="room-light room-light-b" />
        <span className="room-light room-light-c" />
      </div>

      <Sidebar />

      <div className="classified-main">
        <Topbar />
        <main className="classified-content">
          <Outlet />
        </main>
      </div>

      <AuraCopilot />
    </div>
  );
}
