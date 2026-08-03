import {
    getPendingMetadataFiles,
    markMetadataFailed,
    markMetadataNotFound,
    markMetadataProcessing,
    resetInterruptedMetadataTasks,
    saveMovieMetadata,
  } from "./database";
  import { searchMovieMetadata } from "./tmdb";
  import type { MediaFile } from "../shared/types/media";
  
  const concurrency = 3;
  
  let runningPromise: Promise<void> | null = null;
  let claimLock = Promise.resolve();
  
  function notifyLibraryChanged() {
    window.dispatchEvent(new Event("cinevault:library-changed"));
  }
  
  async function claimNextFile(): Promise<MediaFile | null> {
    let releaseLock: () => void = () => {};
  
    const previousLock = claimLock;
  
    claimLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
  
    await previousLock;
  
    try {
      const [file] = await getPendingMetadataFiles(1);
  
      if (!file?.id) {
        return null;
      }
  
      await markMetadataProcessing(file.id);
  
      return file;
    } finally {
      releaseLock();
    }
  }
  
  async function processFile(file: MediaFile): Promise<void> {
    if (!file.id) {
      return;
    }
  
    notifyLibraryChanged();
  
    try {
      const metadata = await searchMovieMetadata(file.title, file.year);
  
      if (!metadata) {
        await markMetadataNotFound(file.id);
        notifyLibraryChanged();
        return;
      }
  
      await saveMovieMetadata(file.id, metadata);
    } catch (error) {
      await markMetadataFailed(file.id, String(error));
    }
  
    notifyLibraryChanged();
  }
  
  async function worker(): Promise<void> {
    while (true) {
      const file = await claimNextFile();
  
      if (!file) {
        return;
      }
  
      await processFile(file);
    }
  }
  
  async function executeQueue(): Promise<void> {
    await resetInterruptedMetadataTasks();
  
    await Promise.all(
      Array.from({ length: concurrency }, () => worker()),
    );
  
    notifyLibraryChanged();
  }
  
  export function runMetadataQueue(): Promise<void> {
    if (!runningPromise) {
      runningPromise = executeQueue().finally(() => {
        runningPromise = null;
      });
    }
  
    return runningPromise;
  }