import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/adminSessionCookie";

function buildCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const accessToken =
    typeof body?.accessToken === "string" ? body.accessToken : null;
  const expiresAt =
    typeof body?.expiresAt === "number" ? body.expiresAt : null;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing access token." },
      { status: 400 }
    );
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const maxAge = expiresAt ? Math.max(expiresAt - nowInSeconds, 0) : 60 * 60;

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    accessToken,
    buildCookieOptions(maxAge)
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", buildCookieOptions(0));
  return response;
}
