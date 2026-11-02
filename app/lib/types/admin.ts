/** What the API's Valorant background queue runs (`ValBackgroundTaskKind`). */
export type ValBackgroundTaskKind = 'Backfill' | 'Reimport' | 'Extras'

export interface ValBackgroundTaskDto {
  kind: ValBackgroundTaskKind;
  /** `null` for every account. */
  playerId: number | null;
  /** Reimport only: the oldest game start reimported. */
  since: string | null;
  enqueuedOn: string;
}

export interface ValBackgroundTaskResultDto {
  task: ValBackgroundTaskDto;
  startedOn: string;
  finishedOn: string;
  failed: boolean;
  /** An English sentence from the API, printed as is in a log line. */
  summary: string;
}

/**
 * `GET /val/admin/queue`, and the `202` of every enqueuing route. The queue lives in the API's memory:
 * a redeploy empties it.
 */
export interface ValBackgroundQueueStatusDto {
  inProgress: ValBackgroundTaskDto | null;
  inProgressStartedOn: string | null;
  pending: ValBackgroundTaskDto[];
  recentResults: ValBackgroundTaskResultDto[];
}
