import { getDataStore } from "@/lib/data";
import { TopNav } from "@/components/layout/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const notifications = await getDataStore().listNotifications();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav notifications={notifications} />
      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
