import { useCallback, useEffect, useState } from "react";
import { DriveFile } from "../types";
import { driveApi } from "../utils";

export function useDriveContext() {
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveLoading, setDriveLoading] = useState(true);
  const [driveError, setDriveError] = useState("");
  const [driveOpen, setDriveOpen] = useState(false);
  const [selectedDriveIds, setSelectedDriveIds] = useState<Set<string>>(new Set());
  const [driveContents, setDriveContents] = useState<Record<string, string>>({});
  const [driveLoadingIds, setDriveLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    driveApi.listFiles()
      .then((files) => setDriveFiles(files))
      .catch((err) => setDriveError(err.message || "Could not load Drive files"))
      .finally(() => setDriveLoading(false));
  }, []);

  const toggleDriveFile = useCallback(async (file: DriveFile) => {
    const id = file.id;
    const next = new Set(selectedDriveIds);
    if (next.has(id)) {
      next.delete(id);
      setSelectedDriveIds(next);
    } else {
      next.add(id);
      setSelectedDriveIds(next);
      if (!driveContents[id]) {
        setDriveLoadingIds((prev) => new Set(prev).add(id));
        try {
          const { content } = await driveApi.readFile(id);
          setDriveContents((prev) => ({ ...prev, [id]: content }));
        } catch {
          next.delete(id);
          setSelectedDriveIds(new Set(next));
        } finally {
          setDriveLoadingIds((prev) => {
            const s = new Set(prev);
            s.delete(id);
            return s;
          });
        }
      }
    }
  }, [selectedDriveIds, driveContents]);

  const clearSelectedDriveFiles = useCallback(() => {
    setSelectedDriveIds(new Set());
  }, []);

  return {
    driveFiles,
    driveLoading,
    driveError,
    driveOpen,
    setDriveOpen,
    selectedDriveIds,
    setSelectedDriveIds,
    driveContents,
    driveLoadingIds,
    toggleDriveFile,
    clearSelectedDriveFiles
  };
}
