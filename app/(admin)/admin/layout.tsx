import { requireLayoutProfile } from "@/lib/layout-auth";
import { supabaseEnvConfigured } from "@/lib/supabase/configured";
import { AppNavbar } from "@/components/AppNavbar";
import { SetupNotice } from "@/components/SetupNotice";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseEnvConfigured()) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <SetupNotice />
        </main>
      </div>
    );
  }
  const { profile } = await requireLayoutProfile("admin");
  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar profile={profile} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
