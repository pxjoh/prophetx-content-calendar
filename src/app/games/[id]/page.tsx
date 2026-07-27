import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDataStore } from "@/lib/data";
import { GameDetailPageClient } from "@/components/schedule/GameDetailPageClient";

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getDataStore().getGameDetail(id);
  if (!detail) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <Link href="/" className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-300">
        <ArrowLeft className="h-4 w-4" /> Back to schedule
      </Link>
      <div className="rounded-2xl border border-white/10 bg-navy-900">
        <GameDetailPageClient detail={detail} />
      </div>
    </div>
  );
}
