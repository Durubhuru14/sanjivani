import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { createCampaign } from "@/app/(ngo)/ngo/actions";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  // gate check happens via middleware + RLS; probe approval for a friendly error
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: ngo } = user
    ? await supabase.from("ngos").select("verification_status").eq("profile_id", user.id).single()
    : { data: null };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create a campaign</h1>
        <p className="mt-1 text-muted-foreground">
          Keep the language simple — your volunteers (and future you) will thank you.
        </p>
      </div>

      {ngo && ngo.verification_status !== "approved" ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Approval pending</CardTitle>
            <CardDescription className="text-amber-800">
              Your organisation must be verified before campaigns can be created.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Campaign details</CardTitle>
            <CardDescription>You can change everything later.</CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignForm
              mode="create"
              initial={{
                title: "",
                description: "",
                objectives: "",
                location: "",
                start_date: "",
                end_date: "",
                type: "public",
                status: "upcoming",
                total_budget: "",
                image_url: "",
              }}
              submit={createCampaign}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
