import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "My profile" };

export default async function AdminProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, location, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl animate-fade-up space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My profile</h1>
        <p className="mt-1 text-muted-foreground">
          How your name and photo appear across admin screens and account menus.
        </p>
      </div>
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            Your email ({user.email ?? "—"}) is fixed to the admin account. Only you can edit these.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminProfileForm
            initial={{
              name: profile?.name ?? "",
              location: profile?.location ?? "",
              avatarUrl: profile?.avatar_url ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
