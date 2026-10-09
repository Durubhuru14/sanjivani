"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, Plus, Trash2, UserPlus, Users } from "lucide-react";
import {
  addTeamMember,
  createTeam,
  logHours,
  removeTeam,
  removeTeamMember,
} from "@/app/(ngo)/ngo/actions";
import { runServerAction } from "@/lib/client-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import type { Team, TeamMember } from "@/lib/types";

export interface AssignablePerson {
  userId: string;
  name: string;
  memberType: "staff" | "volunteer";
}

/** Team creation + member assignment + hours logging (spec §5 Campaign Manage).
 *  On terminal campaigns (completed / cancelled) team changes are locked:
 *  members keep their seats and their logged hours — history is preserved. */
export function TeamPanel({
  campaignId,
  teams,
  assignable,
  campaignCompleted,
  changesLocked = false,
}: {
  campaignId: string;
  teams: Team[];
  assignable: AssignablePerson[];
  campaignCompleted: boolean;
  changesLocked?: boolean;
}) {
  const [newTeamName, setNewTeamName] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, successTitle: string) {
    setBusy(true);
    startTransition(async () => {
      const res = await runServerAction(fn);
      setBusy(false);
      if (!res.ok) {
        toast({ title: "Something went wrong", description: res.error });
        return;
      }
      toast({ title: successTitle });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {changesLocked ? (
        <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          This campaign has ended — its teams are locked. Members and their logged hours are
          preserved as history.
        </p>
      ) : null}

      {/* create team */}
      {changesLocked ? null : (
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 p-4">
        <div className="min-w-56 flex-1 space-y-1.5">
          <label htmlFor={`team-name-${campaignId}`} className="text-sm font-medium">
            New team name
          </label>
          <Input
            id={`team-name-${campaignId}`}
            placeholder="Field Crew"
            maxLength={80}
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
          />
        </div>
        <Button
          className="ml-auto gap-2"
          disabled={busy || pending || !newTeamName.trim()}
          onClick={() => {
            run(() => createTeam(campaignId, newTeamName), "Team created");
            setNewTeamName("");
          }}
        >
          {busy || pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Add team
        </Button>
      </div>
      )}

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          hint="Create a team above, then add accepted volunteers and active staff to it."
        />
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.id} className="rounded-xl border shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-3">
                <h3 className="min-w-0 truncate font-semibold">{team.name}</h3>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {(team.members ?? []).length} member{(team.members ?? []).length === 1 ? "" : "s"}
                  </Badge>
                  {changesLocked ? null : (
                    <>
                      <AddMemberDialog
                        team={team}
                        assignable={assignable}
                        onAdd={(userId, memberType) =>
                          run(
                            () => addTeamMember(campaignId, team.id, userId, memberType),
                            "Member added to team"
                          )
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={busy || pending}
                        onClick={() => {
                          if (window.confirm(`Remove the team “${team.name}” and its memberships?`)) {
                            run(() => removeTeam(campaignId, team.id), "Team removed");
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">Remove team</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {(team.members ?? []).length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nobody on this team yet.
                </p>
              ) : (
                <ul className="divide-y">
                  {(team.members ?? []).map((m) => (
                    <li key={m.id} className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                      <UserAvatar
                        name={m.profile?.name}
                        src={m.profile?.avatar_url}
                        className="h-9 w-9 text-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{m.profile?.name ?? "Member"}</p>
                      </div>
                      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <Badge variant="outline" className="font-normal capitalize">
                          {m.member_type}
                        </Badge>
                        <HoursEditor
                          campaignId={campaignId}
                          member={m}
                          campaignCompleted={campaignCompleted}
                          onSave={(hours) =>
                            run(() => logHours(campaignId, m.id, hours), "Hours updated")
                          }
                        />
                        {changesLocked ? null : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={busy || pending}
                            onClick={() => {
                              if (window.confirm(`Remove ${m.profile?.name ?? "this member"} from the team?`)) {
                                run(() => removeTeamMember(campaignId, m.id), "Member removed");
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            <span className="sr-only">Remove member</span>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMemberDialog({
  team,
  assignable,
  onAdd,
}: {
  team: Team;
  assignable: AssignablePerson[];
  onAdd: (userId: string, memberType: "staff" | "volunteer") => void;
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const current = assignable.find((a) => a.userId === userId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" aria-hidden /> Add member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to {team.name}</DialogTitle>
          <DialogDescription>
            Accepted volunteers and active staff can be added. Everyone else first needs an
            accepted application (or a claimed staff invite).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={userId ?? undefined} onValueChange={setUserId}>
            <SelectTrigger aria-label="Pick a person">
              <SelectValue placeholder="Pick a person" />
            </SelectTrigger>
            <SelectContent>
              {assignable.length === 0 ? (
                <div className="p-2 text-center text-sm text-muted-foreground">
                  Nobody available — accept applications or invite staff first.
                </div>
              ) : (
                assignable.map((a) => (
                  <SelectItem key={a.userId} value={a.userId}>
                    {a.name} · {a.memberType}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            disabled={!current}
            onClick={() => {
              if (current) {
                onAdd(current.userId, current.memberType);
                setOpen(false);
                setUserId(null);
              }
            }}
          >
            Add to team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HoursEditor({
  campaignId: _campaignId,
  member,
  campaignCompleted,
  onSave,
}: {
  campaignId: string;
  member: TeamMember;
  campaignCompleted: boolean;
  onSave: (hours: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(member.hours_logged ?? 0));

  if (!campaignCompleted) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums text-muted-foreground"
        title="Hours unlock when the campaign is completed"
      >
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {Number(member.hours_logged ?? 0)} h
      </span>
    );
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-sm font-medium tabular-nums text-muted-foreground hover:text-foreground"
        onClick={() => setEditing(true)}
      >
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {Number(member.hours_logged ?? 0)} h · edit
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        step="0.5"
        value={value}
        className="h-8 w-20"
        aria-label="Hours logged"
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        size="icon"
        className="h-8 w-8"
        aria-label="Save hours"
        onClick={() => {
          onSave(Number(value) || 0);
          setEditing(false);
        }}
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </span>
  );
}
