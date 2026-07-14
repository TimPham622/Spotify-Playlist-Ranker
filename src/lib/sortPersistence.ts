import type { SortSession } from "./sortingEngine";

const SORT_SESSION_STORAGE_KEY = "spotify-bias-sorter:sort-session";

export function loadSortSession() {
  const storedSession = localStorage.getItem(SORT_SESSION_STORAGE_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedSession) as SortSession;
    return parsed.version === 1 ? parsed : null;
  } catch {
    localStorage.removeItem(SORT_SESSION_STORAGE_KEY);
    return null;
  }
}

export function saveSortSession(session: SortSession) {
  localStorage.setItem(SORT_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSortSession() {
  localStorage.removeItem(SORT_SESSION_STORAGE_KEY);
}
