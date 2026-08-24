"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDuration } from "@/lib/time";
import {
  Users,
  ShieldCheck,
  GraduationCap,
  Search,
  Activity,
  Mail,
  Calendar,
  User as UserIcon,
  RefreshCw,
  UserCog,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export interface UserDirectoryItem {
  _id: string;
  name: string;
  email?: string;
  imageUrl?: string;
  clerkId: string;
  role: "admin" | "intern";
  createdAt: string;
  updatedAt?: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalDurationMinutes: number;
  sessionCount: number;
  isCurrentlyWorking: boolean;
  activeTask?: {
    _id: string;
    title: string;
  } | null;
}

export interface UserCounts {
  total: number;
  admin: number;
  intern: number;
}

export function UsersDirectory() {
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [counts, setCounts] = useState<UserCounts>({ total: 0, admin: 0, intern: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "intern">("all");

  // Role Change Modal state
  const [selectedUser, setSelectedUser] = useState<UserDirectoryItem | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "intern">("intern");
  const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (roleFilter !== "all") {
        params.append("role", roleFilter);
      }
      if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }

      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load users (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        if (data.counts) {
          setCounts(data.counts);
        }
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load user directory.");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, searchQuery]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [fetchUsers]);

  // Handle open role change dialog
  const handleOpenRoleModal = (user: UserDirectoryItem) => {
    setSelectedUser(user);
    setNewRole(user.role === "admin" ? "intern" : "admin");
    setUpdateError(null);
  };

  // Submit role update
  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;

    try {
      setIsUpdatingRole(true);
      setUpdateError(null);

      const res = await fetch(`/api/users/${selectedUser._id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update user role");
      }

      // Show notification
      setNotification({
        message: `Successfully changed ${selectedUser.name}'s role to ${newRole === "admin" ? "Admin" : "Intern"}.`,
        type: "success",
      });

      // Update state locally & refresh
      setSelectedUser(null);
      await fetchUsers();

      // Clear notification after 4s
      setTimeout(() => {
        setNotification(null);
      }, 4000);
    } catch (err: any) {
      setUpdateError(err.message || "An error occurred while updating the role.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const currentlyWorkingCount = users.filter((u) => u.isCurrentlyWorking).length;

  const renderRoleTag = (role: "admin" | "intern") => {
    if (role === "admin") {
      return (
        <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1.5 font-semibold text-xs py-0.5 px-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          Admin
        </Badge>
      );
    }

    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 font-semibold text-xs py-0.5 px-2.5">
        <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        Intern
      </Badge>
    );
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Global Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-lg flex items-center justify-between text-xs font-medium border ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Total Users</p>
            <p className="text-2xl font-bold">{counts.total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Admins</p>
            <p className="text-2xl font-bold">{counts.admin}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Interns</p>
            <p className="text-2xl font-bold">{counts.intern}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-zinc-200 dark:border-zinc-800">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Active Now</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              {currentlyWorkingCount}
              {currentlyWorkingCount > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-white dark:bg-zinc-950"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setRoleFilter("all")}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                roleFilter === "all"
                  ? "bg-white dark:bg-zinc-950 text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setRoleFilter("admin")}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                roleFilter === "admin"
                  ? "bg-white dark:bg-zinc-950 text-purple-700 dark:text-purple-300 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-purple-500" />
              Admins ({counts.admin})
            </button>
            <button
              onClick={() => setRoleFilter("intern")}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                roleFilter === "intern"
                  ? "bg-white dark:bg-zinc-950 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="w-3 h-3 text-emerald-500" />
              Interns ({counts.intern})
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsers()}
            disabled={loading}
            className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Users Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-11 h-11 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-16 w-full rounded-md" />
            </Card>
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground space-y-2">
          <UserIcon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="font-semibold text-foreground">No users found</p>
          <p className="text-xs">No users match the selected role or search filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <Card
              key={u._id}
              className={`hover:border-zinc-300 dark:hover:border-zinc-700 transition flex flex-col justify-between ${
                u.isCurrentlyWorking ? "border-emerald-500/40 bg-emerald-500/[0.02]" : ""
              }`}
            >
              <CardHeader className="p-5 pb-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {u.imageUrl ? (
                      <img
                        src={u.imageUrl}
                        alt={u.name}
                        className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-sm flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                        {getInitials(u.name)}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <CardTitle className="text-base font-semibold leading-snug">
                        {u.name || "Unnamed User"}
                      </CardTitle>
                      {u.email ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          {u.email}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/80 font-mono line-clamp-1">
                          ID: {u.clerkId.slice(0, 12)}...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {renderRoleTag(u.role)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenRoleModal(u)}
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer font-medium"
                    >
                      <UserCog className="w-3 h-3" />
                      Change Role
                    </Button>
                  </div>
                </div>

                {u.isCurrentlyWorking && u.activeTask && (
                  <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Currently working on:
                    </div>
                    <p className="font-medium text-xs line-clamp-1 text-foreground">
                      {u.activeTask.title}
                    </p>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3">
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-lg text-center border border-zinc-100 dark:border-zinc-800/80">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground font-medium">Tasks</p>
                    <p className="text-sm font-bold text-foreground">{u.totalTasks}</p>
                  </div>
                  <div className="space-y-0.5 border-x border-zinc-200 dark:border-zinc-800">
                    <p className="text-[10px] text-muted-foreground font-medium">Done</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {u.completedTasks}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground font-medium">Time Logged</p>
                    <p className="text-xs font-bold text-foreground">
                      {formatDuration(u.totalDurationMinutes)}
                    </p>
                  </div>
                </div>

                {/* Footer / Registered Date */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                  <span>{u.sessionCount} sessions</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Change Role Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Change User Role
            </DialogTitle>
            <DialogDescription>
              Update access level and workspace permissions for this user.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2">
              {/* User Profile summary */}
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{selectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email || selectedUser.clerkId}</p>
                </div>
              </div>

              {/* Role Transition Visual */}
              <div className="flex items-center justify-between gap-3 p-3 bg-zinc-100/70 dark:bg-zinc-800/60 rounded-lg text-xs">
                <div className="space-y-1">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Current Role</span>
                  {renderRoleTag(selectedUser.role)}
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <div className="space-y-1">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">New Role</span>
                  {renderRoleTag(newRole)}
                </div>
              </div>

              {/* Role Selection Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Select Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "admin" | "intern")}
                  className="w-full h-10 rounded-md border border-input bg-white dark:bg-zinc-950 px-3 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="intern">Intern (Task execution & time tracking)</option>
                  <option value="admin">Admin (Full administrative & monitoring access)</option>
                </select>
              </div>

              {/* Permission Context Warning */}
              {newRole === "admin" ? (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs text-purple-900 dark:text-purple-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Granting Admin Privileges
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    This user will be able to create and manage projects, assign tasks to interns, monitor live sessions, and change other user roles.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-900 dark:text-amber-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Demoting to Intern
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    This user will lose access to the Admin Command Center and will only be able to view their assigned tasks.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {updateError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{updateError}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSelectedUser(null)}
              disabled={isUpdatingRole}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRoleChange}
              disabled={isUpdatingRole || selectedUser?.role === newRole}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer gap-1.5"
            >
              {isUpdatingRole ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm Role Change"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
