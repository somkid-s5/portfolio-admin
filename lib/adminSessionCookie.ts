export const ADMIN_SESSION_COOKIE = "pa-access-token";

export async function syncAdminSessionCookie(
  accessToken: string | null,
  expiresAt?: number | null
) {
  if (typeof window === "undefined") return;

  if (!accessToken) {
    await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
    return;
  }

  await fetch("/api/admin/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      accessToken,
      expiresAt: expiresAt ?? null,
    }),
  });
}
