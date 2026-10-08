import { requireLayoutProfile } from "@/lib/layout-auth";
import { AppNavbar } from "@/components/AppNavbar";

export default async function VolunteerLayout({ children }: { children: React.ReactNode }) {
  const { profile, email } = await requireLayoutProfile("volunteer");
  return (
    <div className="flex min-h-screen flex-col">
      <AppNavbar profile={profile} email={email} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
