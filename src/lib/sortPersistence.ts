import { SORT_SESSION_VERSION, type SortSession } from "./sortingEngine";

const SORT_SESSION_STORAGE_KEY = "spotify-bias-sorter:sort-session";

export function loadSortSession() {
  const storedSession = localStorage.getItem(SORT_SESSION_STORAGE_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedSession) as unknown;

    if (isCompatibleSortSession(parsed)) {
      return parsed;
    }

    localStorage.removeItem(SORT_SESSION_STORAGE_KEY);
    return null;
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

function isCompatibleSortSession(value: unknown): value is SortSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<SortSession>;

  if (session.version !== SORT_SESSION_VERSION) {
    return false;
  }

  if (session.kind === "standard") {
    return (session.mode === "all" || session.mode === "subset") && Boolean(session.merge);
  }

  return session.kind === "fast" && session.mode === "fast" && typeof session.stage === "string";
}
