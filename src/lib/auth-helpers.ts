import { auth } from "./auth";

/**
 * Check if the current session user has admin-level access.
 * Both admin and manager roles have the same access level.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { authorized: false, session: null } as const;

  const role = (session.user as { role: string }).role;
  if (role !== "admin" && role !== "manager") {
    return { authorized: false, session } as const;
  }

  return { authorized: true, session } as const;
}

/**
 * Check if the current session user is authenticated.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) return { authorized: false, session: null } as const;
  return { authorized: true, session } as const;
}
