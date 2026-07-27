import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import { createSessionToken, verifyPassword, SESSION_COOKIE } from "@/lib/auth/session";

export const metadata = {
  title: "Sign in — ProphetX Content Command Center",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.from && params.from.startsWith("/") ? params.from : "/";

  async function login(formData: FormData) {
    "use server";
    const password = String(formData.get("password") ?? "");
    const from = String(formData.get("from") ?? "/");

    if (!verifyPassword(password)) {
      redirect(`/login?error=1&from=${encodeURIComponent(from)}`);
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE.name, createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE.maxAge,
    });

    redirect(from || "/");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-navy-900 p-8 shadow-2xl shadow-black/40">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            ProphetX Content Command Center
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Enter the shared team password to continue.
          </p>
        </div>

        <form action={login} className="space-y-4">
          <input type="hidden" name="from" value={redirectTo} />
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-navy-850 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-teal-500/50"
              placeholder="••••••••"
            />
          </div>

          {params.error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Incorrect password. Try again.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-teal-400"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}
