"use client";

import { useRouter } from "next/navigation";
import { GameDetailContent } from "./GameDetailContent";
import type { GameDetail } from "@/types/domain";

export function GameDetailPageClient({ detail }: { detail: GameDetail }) {
  const router = useRouter();
  return <GameDetailContent detail={detail} showFullPageLink={false} onChanged={() => router.refresh()} />;
}
