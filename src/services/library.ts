import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { MediaFile } from "../shared/types/media";

export async function selectAndScanFolder(): Promise<{
  folderPath: string;
  files: MediaFile[];
} | null> {
  const folderPath = await open({
    directory: true,
    multiple: false,
    title: "Выберите папку с фильмами",
  });

  if (!folderPath) {
    return null;
  }

  const files = await invoke<MediaFile[]>("scan_media_folder", {
    folderPath,
  });

  return {
    folderPath,
    files,
  };
}