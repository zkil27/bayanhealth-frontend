"use client";

import * as React from "react";
import { MoreHorizontal, SearchIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { AsyncView } from "@/components/async-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  ASSIGNABLE_GROUPS,
  fetchAdminUsers,
  updateAdminUserGroups,
  updateAdminUserStatus,
  type AdminUser,
  type CognitoRbacGroup,
} from "@/features/admin/lib/api/adminData";

/**
 * Admin user management (`/admin/users`, design A6).
 *
 * Reads `GET /v1/admin/users` through {@link AsyncView} and writes back through `PUT /v1/admin/users/{userId}/groups` and
 * `PUT /v1/admin/users/{userId}/status`. Both writes replace rather than merge,
 * are idempotency-keyed by the API client, and are confirmed before they run —
 * changing someone's role or locking them out is not an undoable click.
 *
 * The backend enforces admin continuity (the last admin cannot be demoted) and
 * answers `409`; that message is surfaced verbatim rather than being retried.
 */

const GROUP_LABEL: Record<string, string> = {
  patient: "Patient",
  doctor: "Doctor",
  admin: "Admin",
};

function statusMeta(user: AdminUser): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (!user.enabled) return { label: "Disabled", variant: "destructive" };
  if (user.status === "CONFIRMED") return { label: "Active", variant: "default" };
  if (user.status === "FORCE_CHANGE_PASSWORD" || user.status === "RESET_REQUIRED") {
    return { label: "Invited", variant: "secondary" };
  }
  return { label: user.status || "Unknown", variant: "outline" };
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Surface an API failure using the backend's own message where it sent one. */
function reportError(error: unknown, fallback: string) {
  toast.error(error instanceof ApiError ? error.message : fallback);
}

export default function AdminUsersPage() {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  // `/admin` is admin-only at the route guard, so this is belt-and-braces
  // against a stale cookie rather than a second role tier. Selected as a boolean
  // rather than as the roles array — a fresh `[]` out of the selector on every
  // render would re-render this subtree forever.
  const canManage = useAuthStore((s) =>
    (s.session?.roles ?? []).includes("admin"),
  );

  return (
    <section className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">User management</h1>
        <p className="text-sm text-muted-foreground">
          Review platform accounts, their roles, and current status.
        </p>
      </div>

      <AsyncView<AdminUser[]>
        fetcher={() => fetchAdminUsers(idToken ?? "")}
        deps={[idToken]}
        isEmpty={(users) => users.length === 0}
        empty={
          <Card>
            <CardContent className="pt-6">
              <AdminUsersEmpty />
            </CardContent>
          </Card>
        }
      >
        {(users) => <UsersTable initial={users} canManage={canManage} />}
      </AsyncView>
    </section>
  );
}

function UsersTable({
  initial,
  canManage,
}: {
  initial: AdminUser[];
  canManage: boolean;
}) {
  // Held locally so a completed write updates the row in place; the endpoint
  // returns the updated record, so there is nothing to guess at.
  const [users, setUsers] = React.useState(initial);
  const [query, setQuery] = React.useState("");

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? users.filter((u) => u.email.toLowerCase().includes(needle))
    : users;

  function replace(updated: AdminUser) {
    setUsers((current) =>
      current.map((u) => (u.userId === updated.userId ? updated : u)),
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>All users</CardTitle>
            <CardDescription>
              Accounts provisioned on the platform, drawn from the identity
              store.
            </CardDescription>
          </div>
          <div className="relative w-full max-w-64">
            <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search by email"
              placeholder="Search email"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <AdminUsersEmpty filtered={needle.length > 0} />
        ) : (
          <Table data-slot="admin-users-table">
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                {canManage && (
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((user) => {
                const status = statusMeta(user);
                return (
                  <TableRow key={user.userId} data-slot="admin-user-row">
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.groups.length > 0 ? (
                          user.groups.map((group) => (
                            <Badge key={group} variant="outline">
                              {GROUP_LABEL[group] ?? group}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">No role</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <UserRowActions user={user} onUpdated={replace} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function UserRowActions({
  user,
  onUpdated,
}: {
  user: AdminUser;
  onUpdated: (updated: AdminUser) => void;
}) {
  const [rolesOpen, setRolesOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label={`Actions for ${user.email}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRolesOpen(true)}>
            Manage roles…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setStatusOpen(true)}>
            {user.enabled ? "Disable account…" : "Enable account…"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/*
        Mounted only while open so the checkbox selection is seeded from the
        account's real membership on every open — a cancelled edit cannot leak
        into the next one, and no effect is needed to reset it.
      */}
      {rolesOpen && (
        <ManageRolesDialog
          user={user}
          onClose={() => setRolesOpen(false)}
          onUpdated={onUpdated}
        />
      )}
      <ToggleStatusDialog
        user={user}
        open={statusOpen}
        onOpenChange={setStatusOpen}
        onUpdated={onUpdated}
      />
    </>
  );
}

function ManageRolesDialog({
  user,
  onClose,
  onUpdated,
}: {
  user: AdminUser;
  onClose: () => void;
  onUpdated: (updated: AdminUser) => void;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [selected, setSelected] = React.useState<CognitoRbacGroup[]>(() =>
    ASSIGNABLE_GROUPS.filter((g) => user.groups.includes(g)),
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const unchanged =
    selected.length === user.groups.length &&
    selected.every((g) => user.groups.includes(g));

  function toggle(group: CognitoRbacGroup, checked: boolean) {
    setSelected((current) =>
      checked
        ? ASSIGNABLE_GROUPS.filter((g) => g === group || current.includes(g))
        : current.filter((g) => g !== group),
    );
  }

  async function save() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateAdminUserGroups(
        idToken ?? "",
        user.userId,
        selected,
      );
      onUpdated(updated);
      onClose();
      toast.success(`Roles updated for ${user.email}.`);
    } catch (error) {
      reportError(error, "Could not update roles.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage roles</DialogTitle>
          <DialogDescription>
            Replaces every role on {user.email}. Roles decide which areas of the
            platform the account can reach.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {ASSIGNABLE_GROUPS.map((group) => (
            <div key={group} className="flex items-center gap-2.5">
              <Checkbox
                id={`${user.userId}-${group}`}
                checked={selected.includes(group)}
                onCheckedChange={(checked) => toggle(group, checked === true)}
              />
              <Label htmlFor={`${user.userId}-${group}`}>
                {GROUP_LABEL[group] ?? group}
              </Label>
            </div>
          ))}
          {selected.length === 0 && (
            <p className="text-xs text-muted-foreground">
              With no roles the account keeps its sign-in but can reach no area
              of the platform.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" disabled={isSaving} onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={unchanged || isSaving}>
            {isSaving && <Spinner className="h-4 w-4" />}
            {isSaving ? "Saving…" : "Save roles"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleStatusDialog({
  user,
  open,
  onOpenChange,
  onUpdated,
}: {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updated: AdminUser) => void;
}) {
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [isSaving, setIsSaving] = React.useState(false);
  const disabling = user.enabled;

  async function confirm() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = await updateAdminUserStatus(
        idToken ?? "",
        user.userId,
        !user.enabled,
      );
      onUpdated(updated);
      onOpenChange(false);
      toast.success(
        `${user.email} ${disabling ? "disabled" : "enabled"}.`,
      );
    } catch (error) {
      reportError(error, "Could not change the account status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {disabling ? "Disable this account?" : "Enable this account?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {disabling
              ? `${user.email} will be signed out and unable to sign in again until the account is re-enabled. Bookings and records are not deleted.`
              : `${user.email} will be able to sign in again.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={isSaving}>
            {isSaving && <Spinner className="h-4 w-4" />}
            {disabling ? "Disable account" : "Enable account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AdminUsersEmpty({ filtered = false }: { filtered?: boolean }) {
  return (
    <Empty data-slot="admin-users-empty">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersIcon />
        </EmptyMedia>
        <EmptyTitle>
          {filtered ? "No matching accounts" : "No users found"}
        </EmptyTitle>
        <EmptyDescription>
          {filtered
            ? "No account on this page matches that email."
            : "There are no platform accounts to show right now."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
