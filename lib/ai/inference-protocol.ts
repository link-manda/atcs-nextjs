export interface WorkerProgressInfo {
  status: "loading";
  progress: number;
  file?: string;
  loaded?: number;
  total?: number;
}

export interface RawPrediction {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

export type WorkerRequest =
  | { type: "load"; model: string }
  | {
      type: "detect";
      id: number;
      model: string;
      buffer: ArrayBuffer;
      width: number;
      height: number;
      threshold: number;
    };

export type WorkerResponse =
  | { type: "progress"; info: WorkerProgressInfo }
  | { type: "ready" }
  | { type: "loadError"; message: string }
  | { type: "result"; id: number; predictions: RawPrediction[] }
  | { type: "error"; id: number; message: string };
