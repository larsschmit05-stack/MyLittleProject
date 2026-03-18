import type { SerializedModel } from './flow';

/** Matches the DB `scenarios` table row shape */
export interface DbScenario {
  id: string;
  model_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  data: SerializedModel;
  results: ScenarioResults | null;
}

/** Stored in scenarios.results JSONB */
export interface ScenarioResults {
  throughput: number;
  bottleneck_node_ids: string[];
  utilization: Record<string, number>;
}

/** For INSERT — DB generates id + timestamps */
export type ScenarioInsert = {
  model_id: string;
  name: string;
  data: SerializedModel;
  results?: ScenarioResults | null;
};

/** For UPDATE — all fields optional */
export type ScenarioUpdate = Partial<Pick<DbScenario, 'name' | 'data' | 'results'>>;
