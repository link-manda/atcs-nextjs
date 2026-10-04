import { InferenceBenchmark } from './benchmark';

describe('InferenceBenchmark', () => {
  it('should compute median and p95 correctly from a fixed sample array', () => {
    const benchmark = new InferenceBenchmark(100);
    
    // Insert values 1 to 100
    for (let i = 1; i <= 100; i++) {
      benchmark.recordInference(i);
    }
    
    const metrics = benchmark.getMetrics();
    expect(metrics).not.toBeNull();
    
    // Median of 1..100 is the 50th element (0-indexed, so index 50 is 51)
    // Wait, floor(100/2) = 50. index 50 is 51.
    expect(metrics?.medianMs).toBe(51);
    
    // p95 of 1..100: floor(100 * 0.95) = 95. Index 95 is 96.
    expect(metrics?.p95Ms).toBe(96);
    
    // Average is 50.5, so average FPS is 1000 / 50.5
    expect(metrics?.averageFps).toBeCloseTo(1000 / 50.5, 1);
    expect(metrics?.sampleCount).toBe(100);
  });

  it('should handle small sample arrays', () => {
    const benchmark = new InferenceBenchmark(10);
    benchmark.recordInference(10);
    
    const metrics = benchmark.getMetrics();
    expect(metrics?.medianMs).toBe(10);
    expect(metrics?.p95Ms).toBe(10);
    expect(metrics?.sampleCount).toBe(1);
  });

  it('should respect maxSamples sliding window', () => {
    const benchmark = new InferenceBenchmark(5);
    for (let i = 1; i <= 10; i++) {
      benchmark.recordInference(i);
    }
    
    // The samples should be [6, 7, 8, 9, 10]
    const metrics = benchmark.getMetrics();
    expect(metrics?.sampleCount).toBe(5);
    expect(metrics?.medianMs).toBe(8); // floor(5/2) = 2 -> index 2 is 8
    expect(metrics?.p95Ms).toBe(10); // floor(5*0.95) = 4 -> index 4 is 10
  });
});
