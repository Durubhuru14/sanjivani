import { requireLayoutProfile } from "@/lib/layout-auth";
import { AppNavbar } from "@/components/AppNavbar";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, email } = await requireLayoutProfile("admin");
  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar profile={profile} email={email} />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav />
        {children}
      </main>
    </div>
  );
}
