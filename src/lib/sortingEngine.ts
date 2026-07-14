import type { SortableTrack, SpotifyPlaylistForSorting } from "./spotifyPlaylist";

export type SortChoice = "left" | "right" | "tie";
export type SortMode = "all" | "subset";
export type SortStatus = "sorting" | "complete";

export type RankGroup = {
  id: string;
  tracks: SortableTrack[];
};

export type MergeCursor = {
  left: RankGroup[];
  right: RankGroup[];
  merged: RankGroup[];
  leftIndex: number;
  rightIndex: number;
};

export type PlaylistSnapshot = {
  id: string;
  name: string;
  ownerName: string;
  imageUrl: string;
  totalItems: number;
  filteredOutCount: number;
};

export type SortHistoryItem = {
  matchupNumber: number;
  choice: SortChoice;
  leftGroupIds: string[];
  rightGroupIds: string[];
  leftRepresentativeId: string;
  rightRepresentativeId: string;
  createdTieGroupId?: string;
  decidedAt: string;
};

export type SortSession = {
  version: 1;
  status: SortStatus;
  playlist: PlaylistSnapshot;
  selectedTracks: SortableTrack[];
  mode: SortMode;
  requestedSubsetSize: number | null;
  runs: RankGroup[][];
  nextRuns: RankGroup[][];
  currentMerge: MergeCursor | null;
  sortedGroups: RankGroup[];
  comparisonsMade: number;
  estimatedMatchups: number;
  history: SortHistoryItem[];
  createdAt: string;
  updatedAt: string;
};

export type CurrentMatchup = {
  left: RankGroup;
  right: RankGroup;
};

export type RankedTrack = {
  rank: number;
  tieSize: number;
  groupId: string;
  track: SortableTrack;
};

export function estimateMergeSortMatchups(count: number) {
  if (count <= 1) {
    return 0;
  }

  const mergeDepth = Math.ceil(Math.log2(count));
  return count * mergeDepth - 2 ** mergeDepth + 1;
}

export function pickRandomSubset(tracks: SortableTrack[], count: number) {
  const safeCount = clamp(count, 0, tracks.length);
  const shuffled = [...tracks];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.slice(0, safeCount);
}

export function createSortSession(
  playlist: SpotifyPlaylistForSorting,
  selectedTracks: SortableTrack[],
  mode: SortMode,
  requestedSubsetSize: number | null,
): SortSession {
  const now = new Date().toISOString();
  const initialRuns = selectedTracks.map((track) => [{ id: `group-${track.id}`, tracks: [track] }]);
  const baseSession: SortSession = {
    version: 1,
    status: "sorting",
    playlist: {
      id: playlist.id,
      name: playlist.name,
      ownerName: playlist.ownerName,
      imageUrl: playlist.imageUrl,
      totalItems: playlist.totalItems,
      filteredOutCount: playlist.filteredOutCount,
    },
    selectedTracks,
    mode,
    requestedSubsetSize,
    runs: initialRuns,
    nextRuns: [],
    currentMerge: null,
    sortedGroups: [],
    comparisonsMade: 0,
    estimatedMatchups: estimateMergeSortMatchups(selectedTracks.length),
    history: [],
    createdAt: now,
    updatedAt: now,
  };

  return advanceUntilChoiceNeeded(baseSession);
}

export function getCurrentMatchup(session: SortSession): CurrentMatchup | null {
  const merge = session.currentMerge;

  if (!merge || session.status === "complete") {
    return null;
  }

  const left = merge.left[merge.leftIndex];
  const right = merge.right[merge.rightIndex];

  return left && right ? { left, right } : null;
}

export function applySortChoice(session: SortSession, choice: SortChoice): SortSession {
  const matchup = getCurrentMatchup(session);
  const merge = session.currentMerge;

  if (!matchup || !merge) {
    return session;
  }

  const matchupNumber = session.comparisonsMade + 1;
  const nextMerge: MergeCursor = {
    ...merge,
    merged: [...merge.merged],
  };
  let createdTieGroupId: string | undefined;

  if (choice === "left") {
    nextMerge.merged.push(matchup.left);
    nextMerge.leftIndex += 1;
  }

  if (choice === "right") {
    nextMerge.merged.push(matchup.right);
    nextMerge.rightIndex += 1;
  }

  if (choice === "tie") {
    const tiedGroup = tieGroups(matchup.left, matchup.right, matchupNumber);
    createdTieGroupId = tiedGroup.id;
    nextMerge.merged.push(tiedGroup);
    nextMerge.leftIndex += 1;
    nextMerge.rightIndex += 1;
  }

  const nextSession: SortSession = {
    ...session,
    currentMerge: nextMerge,
    comparisonsMade: matchupNumber,
    history: [
      ...session.history,
      {
        matchupNumber,
        choice,
        leftGroupIds: matchup.left.tracks.map((track) => track.id),
        rightGroupIds: matchup.right.tracks.map((track) => track.id),
        leftRepresentativeId: matchup.left.tracks[0]?.id ?? "",
        rightRepresentativeId: matchup.right.tracks[0]?.id ?? "",
        createdTieGroupId,
        decidedAt: new Date().toISOString(),
      },
    ],
  };

  return advanceUntilChoiceNeeded(nextSession);
}

export function getRankedTracks(session: SortSession): RankedTrack[] {
  let rank = 1;

  return session.sortedGroups.flatMap((group) => {
    const groupRank = rank;
    rank += group.tracks.length;

    return group.tracks.map((track) => ({
      rank: groupRank,
      tieSize: group.tracks.length,
      groupId: group.id,
      track,
    }));
  });
}

function advanceUntilChoiceNeeded(session: SortSession): SortSession {
  let working = { ...session };

  while (working.status === "sorting") {
    if (working.currentMerge) {
      const finishedMerge = finishMergeIfNeeded(working.currentMerge);

      if (!finishedMerge) {
        return touch(working);
      }

      working = {
        ...working,
        currentMerge: null,
        nextRuns: [...working.nextRuns, finishedMerge],
      };
      continue;
    }

    if (working.runs.length === 0) {
      if (working.nextRuns.length === 0) {
        return touch({ ...working, status: "complete", sortedGroups: [] });
      }

      if (working.nextRuns.length === 1) {
        return touch({ ...working, status: "complete", sortedGroups: working.nextRuns[0] });
      }

      working = {
        ...working,
        runs: working.nextRuns,
        nextRuns: [],
      };
      continue;
    }

    if (working.runs.length === 1) {
      working = {
        ...working,
        runs: [],
        nextRuns: [...working.nextRuns, working.runs[0]],
      };
      continue;
    }

    const [left, right, ...remainingRuns] = working.runs;
    working = {
      ...working,
      runs: remainingRuns,
      currentMerge: {
        left,
        right,
        merged: [],
        leftIndex: 0,
        rightIndex: 0,
      },
    };
  }

  return touch(working);
}

function finishMergeIfNeeded(merge: MergeCursor): RankGroup[] | null {
  const leftDone = merge.leftIndex >= merge.left.length;
  const rightDone = merge.rightIndex >= merge.right.length;

  if (!leftDone && !rightDone) {
    return null;
  }

  return [
    ...merge.merged,
    ...(leftDone ? [] : merge.left.slice(merge.leftIndex)),
    ...(rightDone ? [] : merge.right.slice(merge.rightIndex)),
  ];
}

function tieGroups(left: RankGroup, right: RankGroup, matchupNumber: number): RankGroup {
  return {
    id: `tie-${matchupNumber}-${left.id}-${right.id}`,
    tracks: [...left.tracks, ...right.tracks],
  };
}

function touch(session: SortSession): SortSession {
  return {
    ...session,
    updatedAt: new Date().toISOString(),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
