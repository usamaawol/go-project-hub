import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Shield,
  Crown,
  UserCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AdminUserItem } from "../types";
import { toggleAdminUserPlan, toggleAdminUserRole } from "@/lib/api-client";

interface AdminUsersTabProps {
  users: AdminUserItem[];
  onRefresh: () => void;
  adminKey?: string;
}

export function AdminUsersTab({
  users,
  onRefresh,
  adminKey = "documind-admin-secret",
}: AdminUsersTabProps) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleTogglePlan = async (user: AdminUserItem) => {
    const nextPlan = user.plan === "pro" ? "free" : "pro";
    setUpdatingId(user.uid);
    try {
      const res = await toggleAdminUserPlan(user.uid, nextPlan, adminKey);
      if (res && res.success) {
        toast.success(
          `User "${user.displayName || user.email}" upgraded to ${nextPlan.toUpperCase()} plan!`,
        );
        onRefresh();
      } else {
        toast.error("Failed to toggle plan.");
      }
    } catch {
      toast.error("Error updating user plan");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleRole = async (user: AdminUserItem) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    if (
      !window.confirm(
        `Are you sure you want to change ${user.displayName || user.email}'s permissions to ${nextRole.toUpperCase()}?`,
      )
    ) {
      return;
    }

    setUpdatingId(user.uid);
    try {
      const res = await toggleAdminUserRole(user.uid, nextRole, adminKey);
      if (res && res.success) {
        toast.success(
          `User role changed to ${nextRole.toUpperCase()}${
            nextRole === "admin" ? " (Admin Console access granted)" : ""
          }.`,
        );
        onRefresh();
      } else {
        toast.error("Failed to change user role.");
      }
    } catch {
      toast.error("Error updating user role");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      (u.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      u.uid.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || u.plan === planFilter;
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesPlan && matchesRole;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-base font-bold text-foreground">
            User Accounts & Permissions ({filtered.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            View registered creators, toggle Pro tier access, and assign administrative roles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search user name or email..."
              className="h-8 pl-8 pr-3 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary w-48 sm:w-60"
            />
          </div>

          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Plans</option>
            <option value="pro">Pro Plan</option>
            <option value="free">Free Plan</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="user">Standard Users</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {paginated.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No registered user records matching search criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-mono uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Provider / Sign-In</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((user) => {
                  const isUpdating = updatingId === user.uid;
                  return (
                    <tr key={user.uid} className="hover:bg-muted/30 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center font-mono text-xs">
                            {(user.displayName || user.email || "U")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block truncate">
                              {user.displayName || "DocuMind Creator"}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono block">
                              {user.email || user.uid}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {user.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-muted text-muted-foreground border border-border">
                            User
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {user.plan === "pro" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <Crown className="h-3 w-3" /> Pro Access
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-muted text-muted-foreground border border-border">
                            Free Plan
                          </span>
                        )}
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap capitalize">
                        {user.providerId || "password"}
                      </td>

                      {/* Registered Date */}
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Recent"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedUser(user)}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                            title="Inspect user details"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isUpdating}
                            onClick={() => handleTogglePlan(user)}
                            className="h-7 px-2 text-[11px] font-mono"
                          >
                            {user.plan === "pro" ? "Demote to Free" : "Upgrade to Pro"}
                          </Button>

                          <Button
                            size="sm"
                            variant={user.role === "admin" ? "secondary" : "ghost"}
                            disabled={isUpdating}
                            onClick={() => handleToggleRole(user)}
                            className="h-7 px-2 text-[11px] font-mono"
                          >
                            {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs font-mono bg-muted/20">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-serif text-base font-bold text-foreground">
                  User Account Intelligence
                </h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedUser(null)}
                className="h-7 w-7 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-1">
                <span className="text-muted-foreground font-mono text-[10px] uppercase font-bold">
                  User Unique Identifier (UID)
                </span>
                <div className="font-mono text-xs text-foreground select-all font-semibold">
                  {selectedUser.uid}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border bg-muted/30">
                  <span className="text-muted-foreground font-mono text-[10px] uppercase font-bold block">
                    Display Name
                  </span>
                  <span className="font-semibold text-foreground mt-1 block">
                    {selectedUser.displayName || "Not configured"}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-border bg-muted/30">
                  <span className="text-muted-foreground font-mono text-[10px] uppercase font-bold block">
                    Authentication Provider
                  </span>
                  <span className="font-semibold text-foreground mt-1 block capitalize">
                    {selectedUser.providerId || "password"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-1">
                <span className="text-muted-foreground font-mono text-[10px] uppercase font-bold">
                  Email Address
                </span>
                <div className="font-mono text-xs text-foreground select-all">
                  {selectedUser.email || "No email on record"}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                <span className="text-muted-foreground font-mono text-[11px]">
                  Account Creation Timestamp:
                </span>
                <span className="font-mono text-[11px] font-semibold text-foreground">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : "N/A"}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedUser(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
