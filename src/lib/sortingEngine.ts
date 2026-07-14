import type { SortableTrack, SpotifyPlaylistForSorting } from "./spotifyPlaylist";

export const SORT_SESSION_VERSION = 2;
export const FAST_FINALIST_COUNT = 20;
export const FAST_RESULT_COUNT = 10;

export type SortChoice = "left" | "right" | "tie";
export type SortMode = "all" | "fast" | "subset";
export type StandardSortMode = Exclude<SortMode, "fast">;
export type SortStatus = "sorting" | "complete";
export type FastStage = "qualifying" | "ranking-finalists" | "complete";
export type SortHistoryPhase = "standard" | "fast-qualification" | "fast-finalists";

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

export type MergeSortState = {
  status: SortStatus;
  allowTies: boolean;
  runs: RankGroup[][];
  nextRuns: RankGroup[][];
  currentMerge: MergeCursor | null;
  sortedGroups: RankGroup[];
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
  phase: SortHistoryPhase;
  leftGroupIds: string[];
  rightGroupIds: string[];
  leftRepresentativeId: string;
  rightRepresentativeId: string;
  createdTieGroupId?: string;
  decidedAt: string;
};

type BaseSortSession = {
  version: typeof SORT_SESSION_VERSION;
  status: SortStatus;
  playlist: PlaylistSnapshot;
  selectedTracks: SortableTrack[];
  requestedSubsetSize: number | null;
  comparisonsMade: number;
  estimatedMatchups: number;
  history: SortHistoryItem[];
  createdAt: string;
  updatedAt: string;
};

export type StandardSortSession = BaseSortSession & {
  kind: "standard";
  mode: StandardSortMode;
  merge: MergeSortState;
};

export type FastCandidate = {
  id: string;
  group: RankGroup;
  losses: number;
  active: boolean;
  comparisons: number;
};

export type FastQualificationMatchup = {
  leftCandidateId: string;
  rightCandidateId: string;
};

export type FastQualificationState = {
  candidates: FastCandidate[];
  queue: string[];
  currentMatchup: FastQualificationMatchup | null;
  previousPairKey: string | null;
  seenPairKeys: string[];
  eliminatedCandidateIds: string[];
  byes: string[];
};

export type FastSortSession = BaseSortSession & {
  kind: "fast";
  mode: "fast";
  stage: FastStage;
  qualification: FastQualificationState | null;
  finalMerge: MergeSortState | null;
  sortedGroups: RankGroup[];
  qualificationComparisonsMade: number;
  finalComparisonsMade: number;
};

export type SortSession = StandardSortSession | FastSortSession;

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

export type SortProgress = {
  currentMatchupNumber: number;
  displayedEstimate: number;
  progressPercent: number;
  stageLabel: string;
};

export function estimateMergeSortMatchups(count: number) {
  if (count <= 1) {
    return 0;
  }

  const mergeDepth = Math.ceil(Math.log2(count));
  return count * mergeDepth - 2 ** mergeDepth + 1;
}

export function estimateFastTop10Matchups(trackCount: number) {
  const candidateCount = Math.min(trackCount, FAST_FINALIST_COUNT);
  const qualificationComparisons = trackCount > candidateCount ? 2 * (trackCount - candidateCount) : 0;
  const finalRankingComparisons = estimateMergeSortMatchups(candidateCount);

  return qualificationComparisons + finalRankingComparisons;
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
  return mode === "fast"
    ? createFastSortSession(playlist, selectedTracks)
    : createStandardSortSession(playlist, selectedTracks, mode, requestedSubsetSize);
}

export function getCurrentMatchup(session: SortSession): CurrentMatchup | null {
  if (session.kind === "standard") {
    return getMergeMatchup(session.merge);
  }

  if (session.stage === "qualifying" && session.qualification?.currentMatchup) {
    const candidates = candidateMap(session.qualification.candidates);
    const left = candidates.get(session.qualification.currentMatchup.leftCandidateId);
    const right = candidates.get(session.qualification.currentMatchup.rightCandidateId);

    return left && right ? { left: left.group, right: right.group } : null;
  }

  return session.finalMerge ? getMergeMatchup(session.finalMerge) : null;
}

export function applySortChoice(session: SortSession, choice: SortChoice): SortSession {
  if (session.kind === "standard") {
    return applyStandardSortChoice(session, choice);
  }

  if (choice === "tie") {
    return session;
  }

  if (session.stage === "qualifying") {
    return applyFastQualificationChoice(session, choice);
  }

  if (session.stage === "ranking-finalists") {
    return applyFastFinalistChoice(session, choice);
  }

  return session;
}

export function getRankedTracks(session: SortSession): RankedTrack[] {
  if (session.kind === "fast") {
    const sortedTracks = session.sortedGroups.flatMap((group) => group.tracks);
    const displayCount = Math.min(sortedTracks.length, FAST_RESULT_COUNT);

    return sortedTracks.slice(0, displayCount).map((track, index) => ({
      rank: index + 1,
      tieSize: 1,
      groupId: `fast-${track.id}`,
      track,
    }));
  }

  let rank = 1;

  return session.merge.sortedGroups.flatMap((group) => {
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

export function getSortProgress(session: SortSession): SortProgress {
  const currentMatchupNumber = session.status === "complete" ? session.comparisonsMade : session.comparisonsMade + 1;
  const displayedEstimate = Math.max(session.estimatedMatchups, currentMatchupNumber);
  const progressPercent =
    displayedEstimate === 0 ? 100 : Math.min((session.comparisonsMade / displayedEstimate) * 100, 100);

  return {
    currentMatchupNumber,
    displayedEstimate,
    progressPercent,
    stageLabel: getSortStageLabel(session),
  };
}

export function isTieChoiceAllowed(session: SortSession) {
  return session.kind === "standard" && session.merge.allowTies;
}

export function isFastSortSession(session: SortSession): session is FastSortSession {
  return session.kind === "fast";
}

export function getModeLabel(session: SortSession) {
  if (session.mode === "fast") {
    return "Fast top 10";
  }

  if (session.mode === "subset") {
    return "Random subset";
  }

  return "Full ranking";
}

export function getSortStageLabel(session: SortSession) {
  if (session.kind === "standard") {
    return getModeLabel(session);
  }

  if (session.stage === "qualifying") {
    return "Fast qualification";
  }

  if (session.stage === "ranking-finalists") {
    return "Ranking finalists";
  }

  return "Fast top 10 complete";
}

function createStandardSortSession(
  playlist: SpotifyPlaylistForSorting,
  selectedTracks: SortableTrack[],
  mode: StandardSortMode,
  requestedSubsetSize: number | null,
): StandardSortSession {
  const now = new Date().toISOString();
  const merge = createMergeState(createTrackGroups(selectedTracks), true);

  return touch({
    version: SORT_SESSION_VERSION,
    kind: "standard",
    status: merge.status,
    playlist: createPlaylistSnapshot(playlist),
    selectedTracks,
    mode,
    requestedSubsetSize,
    merge,
    comparisonsMade: 0,
    estimatedMatchups: estimateMergeSortMatchups(selectedTracks.length),
    history: [],
    createdAt: now,
    updatedAt: now,
  });
}

function createFastSortSession(playlist: SpotifyPlaylistForSorting, selectedTracks: SortableTrack[]): FastSortSession {
  const now = new Date().toISOString();
  const groups = createTrackGroups(selectedTracks);
  const baseSession: FastSortSession = {
    version: SORT_SESSION_VERSION,
    kind: "fast",
    status: "sorting",
    playlist: createPlaylistSnapshot(playlist),
    selectedTracks,
    mode: "fast",
    requestedSubsetSize: null,
    stage: selectedTracks.length > FAST_FINALIST_COUNT ? "qualifying" : "ranking-finalists",
    qualification:
      selectedTracks.length > FAST_FINALIST_COUNT ? createQualificationState(shuffleGroups(groups)) : null,
    finalMerge: selectedTracks.length > FAST_FINALIST_COUNT ? null : createMergeState(groups, false),
    sortedGroups: [],
    qualificationComparisonsMade: 0,
    finalComparisonsMade: 0,
    comparisonsMade: 0,
    estimatedMatchups: estimateFastTop10Matchups(selectedTracks.length),
    history: [],
    createdAt: now,
    updatedAt: now,
  };

  return advanceFastSession(baseSession);
}

function applyStandardSortChoice(session: StandardSortSession, choice: SortChoice): StandardSortSession {
  const matchup = getMergeMatchup(session.merge);

  if (!matchup) {
    return session;
  }

  const matchupNumber = session.comparisonsMade + 1;
  const mergeResult = applyMergeChoice(session.merge, choice, matchupNumber);

  if (!mergeResult.applied) {
    return session;
  }

  const merge = advanceMergeState(mergeResult.merge);

  return touch({
    ...session,
    status: merge.status,
    merge,
    comparisonsMade: matchupNumber,
    history: [
      ...session.history,
      createHistoryItem(matchupNumber, choice, "standard", matchup, mergeResult.createdTieGroupId),
    ],
  });
}

function applyFastQualificationChoice(session: FastSortSession, choice: Exclude<SortChoice, "tie">): FastSortSession {
  const qualification = session.qualification;
  const currentMatchup = qualification?.currentMatchup;

  if (!qualification || !currentMatchup) {
    return session;
  }

  const candidates = qualification.candidates.map((candidate) => ({ ...candidate }));
  const candidatesById = candidateMap(candidates);
  const left = candidatesById.get(currentMatchup.leftCandidateId);
  const right = candidatesById.get(currentMatchup.rightCandidateId);

  if (!left || !right) {
    return session;
  }

  const winner = choice === "left" ? left : right;
  const loser = choice === "left" ? right : left;
  winner.comparisons += 1;
  loser.comparisons += 1;
  loser.losses += 1;

  const eliminatedCandidateIds = [...qualification.eliminatedCandidateIds];

  if (loser.losses >= 2) {
    loser.active = false;
    eliminatedCandidateIds.push(loser.id);
  }

  const matchupNumber = session.comparisonsMade + 1;
  const nextQualification: FastQualificationState = advanceQualificationState({
    ...qualification,
    candidates,
    currentMatchup: null,
    previousPairKey: pairKey(left.id, right.id),
    seenPairKeys: uniqueStrings([...qualification.seenPairKeys, pairKey(left.id, right.id)]),
    eliminatedCandidateIds,
    queue: rotateQualificationQueue(qualification.queue, left.id, right.id, candidates),
  });

  return advanceFastSession(
    touch({
      ...session,
      qualification: nextQualification,
      comparisonsMade: matchupNumber,
      qualificationComparisonsMade: session.qualificationComparisonsMade + 1,
      history: [
        ...session.history,
        createHistoryItem(matchupNumber, choice, "fast-qualification", { left: left.group, right: right.group }),
      ],
    }),
  );
}

function applyFastFinalistChoice(session: FastSortSession, choice: Exclude<SortChoice, "tie">): FastSortSession {
  if (!session.finalMerge) {
    return session;
  }

  const matchup = getMergeMatchup(session.finalMerge);

  if (!matchup) {
    return session;
  }

  const matchupNumber = session.comparisonsMade + 1;
  const mergeResult = applyMergeChoice(session.finalMerge, choice, matchupNumber);

  if (!mergeResult.applied) {
    return session;
  }

  const finalMerge = advanceMergeState(mergeResult.merge);
  const nextSession: FastSortSession = touch({
    ...session,
    finalMerge,
    comparisonsMade: matchupNumber,
    finalComparisonsMade: session.finalComparisonsMade + 1,
    history: [
      ...session.history,
      createHistoryItem(matchupNumber, choice, "fast-finalists", matchup),
    ],
  });

  return advanceFastSession(nextSession);
}

function advanceFastSession(session: FastSortSession): FastSortSession {
  if (session.stage === "qualifying") {
    const qualification = session.qualification ? advanceQualificationState(session.qualification) : null;

    if (!qualification) {
      return touch(session);
    }

    if (activeCandidates(qualification).length > FAST_FINALIST_COUNT) {
      return touch({ ...session, qualification });
    }

    const finalists = qualificationFinalists(qualification);
    const finalMerge = createMergeState(finalists.map((candidate) => candidate.group), false);

    return advanceFastSession(
      touch({
        ...session,
        qualification: { ...qualification, currentMatchup: null },
        finalMerge,
        stage: finalMerge.status === "complete" ? "complete" : "ranking-finalists",
        status: finalMerge.status,
        sortedGroups: finalMerge.status === "complete" ? finalMerge.sortedGroups : [],
      }),
    );
  }

  if (session.stage === "ranking-finalists" && session.finalMerge?.status === "complete") {
    return touch({
      ...session,
      stage: "complete",
      status: "complete",
      sortedGroups: session.finalMerge.sortedGroups,
    });
  }

  if (session.stage === "ranking-finalists") {
    return touch({ ...session, status: "sorting" });
  }

  return touch({ ...session, status: "complete" });
}

function createMergeState(groups: RankGroup[], allowTies: boolean): MergeSortState {
  return advanceMergeState({
    status: "sorting",
    allowTies,
    runs: groups.map((group) => [group]),
    nextRuns: [],
    currentMerge: null,
    sortedGroups: [],
  });
}

function advanceMergeState(state: MergeSortState): MergeSortState {
  let working: MergeSortState = { ...state };

  while (working.status === "sorting") {
    if (working.currentMerge) {
      const finishedMerge = finishMergeIfNeeded(working.currentMerge);

      if (!finishedMerge) {
        return working;
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
        return { ...working, status: "complete", sortedGroups: [] };
      }

      if (working.nextRuns.length === 1) {
        return { ...working, status: "complete", sortedGroups: working.nextRuns[0] };
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

  return working;
}

function applyMergeChoice(
  merge: MergeSortState,
  choice: SortChoice,
  matchupNumber: number,
): { applied: boolean; merge: MergeSortState; createdTieGroupId?: string } {
  const matchup = getMergeMatchup(merge);
  const cursor = merge.currentMerge;

  if (!matchup || !cursor || (choice === "tie" && !merge.allowTies)) {
    return { applied: false, merge };
  }

  const nextCursor: MergeCursor = {
    ...cursor,
    merged: [...cursor.merged],
  };
  let createdTieGroupId: string | undefined;

  if (choice === "left") {
    nextCursor.merged.push(matchup.left);
    nextCursor.leftIndex += 1;
  }

  if (choice === "right") {
    nextCursor.merged.push(matchup.right);
    nextCursor.rightIndex += 1;
  }

  if (choice === "tie") {
    const tiedGroup = tieGroups(matchup.left, matchup.right, matchupNumber);
    createdTieGroupId = tiedGroup.id;
    nextCursor.merged.push(tiedGroup);
    nextCursor.leftIndex += 1;
    nextCursor.rightIndex += 1;
  }

  return {
    applied: true,
    merge: {
      ...merge,
      currentMerge: nextCursor,
    },
    createdTieGroupId,
  };
}

function getMergeMatchup(merge: MergeSortState): CurrentMatchup | null {
  const cursor = merge.currentMerge;

  if (!cursor || merge.status === "complete") {
    return null;
  }

  const left = cursor.left[cursor.leftIndex];
  const right = cursor.right[cursor.rightIndex];

  return left && right ? { left, right } : null;
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

function createQualificationState(groups: RankGroup[]): FastQualificationState {
  const candidates = groups.map((group) => ({
    id: `candidate-${group.id}`,
    group,
    losses: 0,
    active: true,
    comparisons: 0,
  }));

  return advanceQualificationState({
    candidates,
    queue: candidates.map((candidate) => candidate.id),
    currentMatchup: null,
    previousPairKey: null,
    seenPairKeys: [],
    eliminatedCandidateIds: [],
    byes: [],
  });
}

function advanceQualificationState(state: FastQualificationState): FastQualificationState {
  if (state.currentMatchup || activeCandidates(state).length <= FAST_FINALIST_COUNT) {
    return state;
  }

  const pair = chooseQualificationPair(state);

  if (!pair) {
    return state;
  }

  return {
    ...state,
    currentMatchup: pair,
    byes:
      activeCandidates(state).length % 2 === 1
        ? [...state.byes, ...activeIdsFromQueue(state).filter((id) => id !== pair.leftCandidateId && id !== pair.rightCandidateId).slice(0, 1)]
        : state.byes,
  };
}

function chooseQualificationPair(state: FastQualificationState): FastQualificationMatchup | null {
  const activeIds = activeIdsFromQueue(state);
  const candidates = candidateMap(state.candidates);
  let bestPair: { leftCandidateId: string; rightCandidateId: string; score: number } | null = null;

  for (let leftIndex = 0; leftIndex < activeIds.length; leftIndex += 1) {
    const left = candidates.get(activeIds[leftIndex]);

    if (!left) {
      continue;
    }

    for (let rightIndex = leftIndex + 1; rightIndex < activeIds.length; rightIndex += 1) {
      const right = candidates.get(activeIds[rightIndex]);

      if (!right) {
        continue;
      }

      const currentPairKey = pairKey(left.id, right.id);
      const sameLossBracket = left.losses === right.losses;
      const isImmediateRematch = currentPairKey === state.previousPairKey;
      const hasBeenSeen = state.seenPairKeys.includes(currentPairKey);
      const score =
        (sameLossBracket ? 0 : 1_000) +
        (isImmediateRematch ? 300 : 0) +
        (hasBeenSeen ? 120 : 0) +
        (left.losses + right.losses) * -80 +
        (left.comparisons + right.comparisons) * 4 +
        leftIndex +
        rightIndex / 100;

      if (!bestPair || score < bestPair.score) {
        bestPair = {
          leftCandidateId: left.id,
          rightCandidateId: right.id,
          score,
        };
      }
    }
  }

  return bestPair ? { leftCandidateId: bestPair.leftCandidateId, rightCandidateId: bestPair.rightCandidateId } : null;
}

function activeIdsFromQueue(state: FastQualificationState) {
  const activeIds = new Set(activeCandidates(state).map((candidate) => candidate.id));
  const queuedIds = state.queue.filter((id) => activeIds.has(id));
  const missingIds = [...activeIds].filter((id) => !queuedIds.includes(id));

  return [...queuedIds, ...missingIds];
}

function rotateQualificationQueue(queue: string[], leftId: string, rightId: string, candidates: FastCandidate[]) {
  const activeIds = new Set(candidates.filter((candidate) => candidate.active).map((candidate) => candidate.id));
  const remainder = queue.filter((id) => activeIds.has(id) && id !== leftId && id !== rightId);
  const rotatedPair = [leftId, rightId].filter((id) => activeIds.has(id));
  const missingIds = [...activeIds].filter((id) => !remainder.includes(id) && !rotatedPair.includes(id));

  return [...remainder, ...missingIds, ...rotatedPair];
}

function qualificationFinalists(state: FastQualificationState) {
  const candidates = candidateMap(state.candidates);

  return activeIdsFromQueue(state)
    .map((id) => candidates.get(id))
    .filter((candidate): candidate is FastCandidate => Boolean(candidate?.active))
    .slice(0, FAST_FINALIST_COUNT);
}

function activeCandidates(state: FastQualificationState) {
  return state.candidates.filter((candidate) => candidate.active);
}

function createTrackGroups(tracks: SortableTrack[]): RankGroup[] {
  return tracks.map((track) => ({ id: `group-${track.id}`, tracks: [track] }));
}

function shuffleGroups(groups: RankGroup[]) {
  return shuffleItems(groups);
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function createPlaylistSnapshot(playlist: SpotifyPlaylistForSorting): PlaylistSnapshot {
  return {
    id: playlist.id,
    name: playlist.name,
    ownerName: playlist.ownerName,
    imageUrl: playlist.imageUrl,
    totalItems: playlist.totalItems,
    filteredOutCount: playlist.filteredOutCount,
  };
}

function createHistoryItem(
  matchupNumber: number,
  choice: SortChoice,
  phase: SortHistoryPhase,
  matchup: CurrentMatchup,
  createdTieGroupId?: string,
): SortHistoryItem {
  return {
    matchupNumber,
    choice,
    phase,
    leftGroupIds: matchup.left.tracks.map((track) => track.id),
    rightGroupIds: matchup.right.tracks.map((track) => track.id),
    leftRepresentativeId: matchup.left.tracks[0]?.id ?? "",
    rightRepresentativeId: matchup.right.tracks[0]?.id ?? "",
    createdTieGroupId,
    decidedAt: new Date().toISOString(),
  };
}

function tieGroups(left: RankGroup, right: RankGroup, matchupNumber: number): RankGroup {
  return {
    id: `tie-${matchupNumber}-${left.id}-${right.id}`,
    tracks: [...left.tracks, ...right.tracks],
  };
}

function candidateMap(candidates: FastCandidate[]) {
  return new Map(candidates.map((candidate) => [candidate.id, candidate]));
}

function pairKey(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join("::");
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function touch<T extends SortSession>(session: T): T {
  return {
    ...session,
    updatedAt: new Date().toISOString(),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
