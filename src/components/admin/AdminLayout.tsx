import { Outlet } from "react-router-dom";
import AdminBottomNav from "./AdminBottomNav";
import PageShell from "../PageShell";

const AdminLayout = () => {
  return (
    <PageShell>
      <div className="pb-20"> {/* Add padding to account for bottom nav */}
        <Outlet />
      </div>
      <AdminBottomNav />
    </PageShell>
  );
};

export default AdminLayout;
