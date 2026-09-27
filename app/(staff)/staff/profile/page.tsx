import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function StaffProfilePage() {
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My profile</h1>
        <p className="mt-1 text-muted-foreground">
          How your NGO and teammates see you across Sanjivani.
        </p>
      </div>
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Only you can edit these.</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffProfileForm
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
