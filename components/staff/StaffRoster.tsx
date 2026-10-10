import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { InviteStaffForm, RemoveStaffButton } from "@/components/staff/InviteStaffForm";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDateTime } from "@/lib/format";
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
              <li
                key={member.id}
                className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
              >
                <UserAvatar
                  name={member.profile?.name ?? member.invited_name}
                  src={member.profile?.avatar_url}
                  className="h-9 w-9 text-xs"
                />
                <div className="row-body">
                  <p className="truncate font-semibold">
                    {member.invited_name ?? member.profile?.name ?? "Staff member"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{member.invited_email}</p>
                  {member.status === "invited" ? (
                    <p className="text-xs italic text-muted-foreground">Not yet claimed</p>
                  ) : null}
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2 max-sm:justify-start sm:shrink-0 sm:justify-end">
                  <StatusBadge status={member.status} />
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
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
