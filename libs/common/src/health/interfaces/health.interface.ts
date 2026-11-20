export type DependencyChecks = Record<string, () => Promise<unknown>>;
export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  dependencies: Record<string, 'up' | 'down'>;
}

export interface LivenessResponse {
  status: 'ok';
}
