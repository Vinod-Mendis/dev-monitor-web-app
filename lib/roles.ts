import { auth, currentUser } from "@clerk/nextjs/server";

export type UserRole = "admin" | "intern";

/**
 * Returns the current user's role from Clerk publicMetadata.
 * Defaults to "intern" if not specified.
 */
export async function getUserRole(): Promise<UserRole> {
  const user = await currentUser();
  if (!user) {
    return "intern";
  }
  const role = user.publicMetadata?.role as string | undefined;
  if (role === "admin") {
    return "admin";
  }
  return "intern";
}

/**
 * Protects an API route/action by checking authentication and user role.
 * Throws an Error with 401/403 status indication if check fails.
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized: User not authenticated");
  }

  const role = await getUserRole();
  if (!allowedRoles.includes(role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return { userId, role };
}

/**
 * Convenience helper to enforce admin role access.
 */
export async function requireAdmin() {
  return requireRole(["admin"]);
}
