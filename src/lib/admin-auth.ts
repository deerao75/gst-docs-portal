import { NextRequest } from "next/server";

export function verifyAdminKey(request: NextRequest): boolean {
  const expected = process.env.ADMIN_KEY?.trim();
  if (!expected) return true;
  const provided =
    request.headers.get("x-admin-key") ??
    request.nextUrl.searchParams.get("key") ??
    "";
  return provided === expected;
}

export function adminKeyRequired(): boolean {
  return Boolean(process.env.ADMIN_KEY?.trim());
}