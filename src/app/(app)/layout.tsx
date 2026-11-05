import { getDataStore } from "@/lib/data";
import { TopNav } from "@/components/layout/TopNav";

// Every page under this layout reads live Supabase data behind a password
// gate (notifications here, plus whatever each page fetches) — there's no
// benefit to statically prerendering an internal dashboard like this at
// build time, and doing so makes the whole production build depend on a
// successful network call to Supabase during the build itself (one hiccup
// there fails the entire deploy, as happened prerendering /archived).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const notifications = await getDataStore().listNotifications();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav notifications={notifications} />
      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
