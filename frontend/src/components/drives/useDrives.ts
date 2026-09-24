import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { api } from "../../lib/api";
import type { DriveListResponse } from "./types";

/** Loads the drive list for whoever is signed in. `locked` carries the plan
 * message when the college's plan has expired (the API answers 402). */
export function useDrives() {
  const [data, setData] = useState<DriveListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);

  const reload = useCallback(() => {
    return api
      .get<DriveListResponse>("/api/drives")
      .then(({ data }) => {
        setData(data);
        setError(null);
      })
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 402) {
          setLocked(err.response.data?.error ?? "Your college's plan has expired.");
        } else {
          setError("Couldn't load campus drives.");
        }
      });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, locked, reload };
}
