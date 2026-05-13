import { supabase } from "@/integrations/supabase/client";

const BUCKET = "autorizacoes";

export async function uploadFile(path: string, file: Blob | File, contentType?: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: contentType ?? (file as File).type ?? "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function removeFiles(paths: string[]) {
  if (!paths.length) return;
  await supabase.storage.from(BUCKET).remove(paths);
}

export async function signedUrl(path: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadBlobUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return URL.createObjectURL(data);
}
