export interface BenchmarkMetrics {
  medianMs: number;
  p95Ms: number;
  averageFps: number;
  sampleCount: number;
}

export class InferenceBenchmark {
  private samples: number[] = [];
  private readonly maxSamples: number;
  private lastReportTime: number = 0;
  private startTime: number = 0;

  constructor(maxSamples: number = 100) {
    this.maxSamples = maxSamples;
  }

  public recordInference(durationMs: number) {
    this.samples.push(durationMs);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift(); // keep it a sliding window
    }
  }

  public getMetrics(): BenchmarkMetrics | null {
    if (this.samples.length === 0) return null;

    const sorted = [...this.samples].sort((a, b) => a - b);
    const medianMs = sorted[Math.floor(sorted.length / 2)];
    const p95Index = Math.floor(sorted.length * 0.95);
    // Handle edge case where length is small
    const p95Ms = sorted[Math.min(p95Index, sorted.length - 1)];
    
    // Calculate max theoretical FPS based on average inference time.
    const sum = this.samples.reduce((a, b) => a + b, 0);
    const avgDuration = sum / this.samples.length;
    const averageFps = avgDuration > 0 ? 1000 / avgDuration : 0;

    return {
      medianMs,
      p95Ms,
      averageFps,
      sampleCount: this.samples.length
    };
  }
}
