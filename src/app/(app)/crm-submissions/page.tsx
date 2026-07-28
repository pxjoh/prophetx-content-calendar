import { getDataStore } from "@/lib/data";
import { CrmPageClient } from "@/components/crm/CrmPageClient";

export default async function CrmSubmissionsPage() {
  const submissions = await getDataStore().listCrmSubmissions({});
  return <CrmPageClient submissions={submissions} />;
}
