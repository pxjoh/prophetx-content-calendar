import { getSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "price-clips";

/** Uploads the rendered video + still to the public price-clips bucket and returns their URLs. */
export async function uploadRenderAssets(renderId: string, video: Buffer, still: Buffer) {
  const client = getSupabaseServerClient();
  const videoPath = `${renderId}/clip.mp4`;
  const stillPath = `${renderId}/final.png`;

  const [videoUpload, stillUpload] = await Promise.all([
    client.storage.from(BUCKET).upload(videoPath, video, { contentType: "video/mp4", upsert: true }),
    client.storage.from(BUCKET).upload(stillPath, still, { contentType: "image/png", upsert: true }),
  ]);
  if (videoUpload.error) throw new Error(`Upload failed (video): ${videoUpload.error.message}`);
  if (stillUpload.error) throw new Error(`Upload failed (still): ${stillUpload.error.message}`);

  return {
    videoUrl: client.storage.from(BUCKET).getPublicUrl(videoPath).data.publicUrl,
    stillUrl: client.storage.from(BUCKET).getPublicUrl(stillPath).data.publicUrl,
  };
}
