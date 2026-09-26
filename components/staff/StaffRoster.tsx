import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/EmptyState";
import { InviteStaffForm, RemoveStaffButton } from "@/components/staff/InviteStaffForm";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, initials } from "@/lib/format";
import type { NgoStaff } from "@/lib/types";
import { Users } from "lucide-react";

/** List + invite/remove staff (spec §4 StaffRoster). */
export function StaffRoster({ staff }: { staff: NgoStaff[] }) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Staff roster</CardTitle>
        <CardDescription>
          Invite people by email. They become active once they sign up with that email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <InviteStaffForm />

        {staff.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff yet"
            hint="Invite your colleagues — they can be added to campaign teams and chat rooms once active."
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {staff.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar className="h-10 w-10 border">
                  {member.profile?.avatar_url ? (
                    <AvatarImage src={member.profile.avatar_url} alt={member.invited_name ?? "staff"} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                    {initials(member.invited_name ?? member.profile?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {member.invited_name ?? member.profile?.name ?? "Staff member"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{member.invited_email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={member.status} />
                  {member.status === "invited" ? (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      Not yet claimed
                    </Badge>
                  ) : null}
                  <span className="hidden text-xs text-muted-foreground md:block">
                    {formatDateTime(member.created_at)}
                  </span>
                  <RemoveStaffButton staffId={member.id} name={member.invited_name ?? member.invited_email} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
