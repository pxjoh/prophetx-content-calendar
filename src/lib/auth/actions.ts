"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./session";

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE.name, "", { path: "/", maxAge: 0 });
  redirect("/login");
}
