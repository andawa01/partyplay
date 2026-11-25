import { Loader2, Plus, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";

import { PasswordInput } from "../../components/admin/PasswordInput";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { ErrorState } from "../../components/ui/error-state";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useAdminSession } from "../../hooks/use-auth";
import {
  useCreateStaff,
  useSetStaffPassword,
  useStaff,
  useUpdateStaff,
} from "../../hooks/use-staff";
import { isApiError } from "../../lib/api";
import {
  createStaffFormSchema,
  roleLabel,
  setStaffPasswordFormSchema,
  staffDisplayName,
  staffRoleOptions,
  type CreateStaffFormValues,
  type SetStaffPasswordFormValues,
  type StaffMember,
  type StaffRole,
} from "../../lib/team";
import { toast, toastError } from "../../lib/toast";

export default function AdminTeamPage() {
  const session = useAdminSession();
  const staffQuery = useStaff();
  const update = useUpdateStaff();
  const selfId = session.data?.id;

  const [createOpen, setCreateOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<StaffMember | null>(null);

  function changeRole(member: StaffMember, role: StaffRole) {
    update.mutate(
      { id: member.id, input: { role } },
      {
        onSuccess: () =>
          toast.success("Role updated", {
            description: `${staffDisplayName(member)} is now ${roleLabel(role).toLowerCase()}.`,
          }),
        onError: (error) => toastError(error, "Could not change that role."),
      },
    );
  }

  function toggleActive(member: StaffMember) {
    const isActive = !member.isActive;
    update.mutate(
      { id: member.id, input: { isActive } },
      {
        onSuccess: () =>
          toast.success(isActive ? "Account enabled" : "Account disabled", {
            description: isActive
              ? `${staffDisplayName(member)} can sign in again.`
              : `${staffDisplayName(member)} has been signed out and cannot sign in.`,
          }),
        onError: (error) => toastError(error, "Could not update that account."),
      },
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 ring-1 ring-brand-100">
            <UsersRound aria-hidden="true" className="size-3.5" />
            Team access
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Team</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Give a helper their own sign-in instead of sharing the owner password. Staff handle
            bookings; admins also manage money and the catalogue. Only owners can change this list.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus aria-hidden="true" className="size-4" />
          Add a team member
        </Button>
      </div>

      <section
        className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="team-list-heading"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 id="team-list-heading" className="text-sm font-semibold text-slate-900">
            Accounts
          </h2>
          <Badge variant="outline">
            {staffQuery.data?.length ?? 0} {staffQuery.data?.length === 1 ? "account" : "accounts"}
          </Badge>
        </div>

        {staffQuery.isPending ? (
          <div className="grid place-items-center px-5 py-16 text-slate-500" aria-busy="true">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
            <span className="sr-only">Loading team accounts…</span>
          </div>
        ) : staffQuery.isError ? (
          <div className="p-5">
            <ErrorState
              title="Could not load the team"
              error={staffQuery.error}
              onRetry={() => void staffQuery.refetch()}
              isRetrying={staffQuery.isFetching}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffQuery.data?.map((member) => {
                const isSelf = member.id === selfId;
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <p className="font-medium text-slate-900">{staffDisplayName(member)}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(value) => changeRole(member, value as StaffRole)}
                        disabled={isSelf || update.isPending}
                      >
                        <SelectTrigger className="h-9 w-36" aria-label={`Role for ${member.email}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {staffRoleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isSelf ? (
                        <p className="mt-1 text-xs text-slate-400">Your own account</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? "default" : "outline"}>
                        {member.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        {isSelf ? null : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPasswordTarget(member)}
                          >
                            Set password
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant={member.isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleActive(member)}
                          disabled={isSelf || update.isPending}
                        >
                          {member.isActive ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
        <p>
          The last active owner cannot be demoted or disabled, and nobody can disable their own
          account. Disabling someone ends their existing session immediately.
        </p>
      </div>

      {createOpen ? <CreateStaffDialog onClose={() => setCreateOpen(false)} /> : null}
      {passwordTarget ? (
        <SetPasswordDialog member={passwordTarget} onClose={() => setPasswordTarget(null)} />
      ) : null}
    </div>
  );
}

function CreateStaffDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateStaff();
  const [values, setValues] = useState<CreateStaffFormValues>({
    name: "",
    email: "",
    role: "STAFF",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CreateStaffFormValues, string>>
  >({});

  function setField<K extends keyof CreateStaffFormValues>(
    field: K,
    value: CreateStaffFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (create.error) {
      create.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createStaffFormSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof CreateStaffFormValues, string>> = {};
      for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (messages?.[0]) {
          next[field as keyof CreateStaffFormValues] = messages[0];
        }
      }
      setFieldErrors(next);
      return;
    }

    create.mutate(parsed.data, {
      onSuccess: (member) => {
        toast.success("Team member added", {
          description: `${member.email} can sign in with the password you set.`,
        });
        onClose();
      },
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
          <DialogDescription>
            They sign in at the normal admin login with this email and temporary password.
          </DialogDescription>
        </DialogHeader>

        {create.error ? (
          <Alert variant="destructive">
            <AlertTitle>The account was not created</AlertTitle>
            <AlertDescription>
              {isApiError(create.error)
                ? create.error.message
                : "Check your connection and try again."}
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="team-name">Name</Label>
            <Input
              id="team-name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.name)}
              className="mt-1.5 h-11"
            />
            {fieldErrors.name ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="team-email">Email</Label>
            <Input
              id="team-email"
              type="email"
              value={values.email}
              onChange={(event) => setField("email", event.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(fieldErrors.email)}
              className="mt-1.5 h-11"
            />
            {fieldErrors.email ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="team-role">Access level</Label>
            <Select
              value={values.role}
              onValueChange={(value) => setField("role", value as StaffRole)}
            >
              <SelectTrigger id="team-role" className="mt-1.5 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {staffRoleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              {staffRoleOptions.find((option) => option.value === values.role)?.hint}
            </p>
          </div>

          <div>
            <Label htmlFor="team-password">Temporary password</Label>
            <PasswordInput
              id="team-password"
              label="temporary password"
              value={values.password}
              onChange={(event) => setField("password", event.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              className="mt-1.5 h-11"
            />
            {fieldErrors.password ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.password}</p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500">
                At least 8 characters with uppercase, lowercase and a number.
              </p>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending} aria-busy={create.isPending}>
              {create.isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SetPasswordDialog({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const setPassword = useSetStaffPassword();
  const [values, setValues] = useState<SetStaffPasswordFormValues>({
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof SetStaffPasswordFormValues, string>>
  >({});

  function setField(field: keyof SetStaffPasswordFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (setPassword.error) {
      setPassword.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = setStaffPasswordFormSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof SetStaffPasswordFormValues, string>> = {};
      for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (messages?.[0]) {
          next[field as keyof SetStaffPasswordFormValues] = messages[0];
        }
      }
      setFieldErrors(next);
      return;
    }

    setPassword.mutate(
      { id: member.id, password: parsed.data.password },
      {
        onSuccess: () => {
          toast.success("Password reset", {
            description: `${member.email} has been signed out and can use the new password.`,
          });
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog aria-hidden="true" className="size-4 text-brand-700" />
            Set a password
          </DialogTitle>
          <DialogDescription>
            For {staffDisplayName(member)} · {member.email}. Their current session ends immediately.
          </DialogDescription>
        </DialogHeader>

        {setPassword.error ? (
          <Alert variant="destructive">
            <AlertTitle>The password was not changed</AlertTitle>
            <AlertDescription>
              {isApiError(setPassword.error)
                ? setPassword.error.message
                : "Check your connection and try again."}
            </AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="member-password">New password</Label>
            <PasswordInput
              id="member-password"
              label="new password"
              value={values.password}
              onChange={(event) => setField("password", event.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              className="mt-1.5 h-11"
            />
            {fieldErrors.password ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">{fieldErrors.password}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="member-password-confirm">Confirm password</Label>
            <PasswordInput
              id="member-password-confirm"
              label="password confirmation"
              value={values.confirmPassword}
              onChange={(event) => setField("confirmPassword", event.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              className="mt-1.5 h-11"
            />
            {fieldErrors.confirmPassword ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={setPassword.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={setPassword.isPending}
              aria-busy={setPassword.isPending}
            >
              {setPassword.isPending ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Set password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
