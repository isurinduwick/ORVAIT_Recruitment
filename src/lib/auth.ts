import { cookies } from "next/headers";

const COOKIE = "zg_admin";

export async function signInAdmin(password: string) {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected || password !== expected) return false;
  const jar = await cookies();
  jar.set(COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return true;
}

export async function signOutAdmin() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return !!token && token === process.env.ADMIN_PASSWORD?.trim();
}
