import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  LibraryFolderType,
  MediaFile,
} from "../shared/types/media";

export async function scanFolder(
  folderPath: string,
  folderType: LibraryFolderType,
): Promise<MediaFile[]> {
  return invoke<MediaFile[]>("scan_media_folder", {
    folderPath,
    folderType,
  });
}

export async function selectAndScanFolder(
  folderType: LibraryFolderType,
): Promise<{
  folderPath: string;
  files: MediaFile[];
} | null> {
  const folderPath = await open({
    directory: true,
    multiple: false,
    title: "Выберите папку с видео",
  });

  if (!folderPath) {
    return null;
  }

  const files = await scanFolder(folderPath, folderType);

  return {
    folderPath,
    files,
  };
}