import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { logoutAction } from "../actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="lg:flex">
      <AdminNav email={session.email} logout={logoutAction} />
      <div className="min-w-0 flex-1 px-4 py-8 md:px-10">{children}</div>
    </div>
  );
}
