import { postProcessYolo } from './yolo-postprocess';

describe('postProcessYolo', () => {
  it('should drop non-vehicle classes and rows below threshold', () => {
    // [xmin, ymin, xmax, ymax, score, class_id]
    const data = new Float32Array([
      10, 10, 100, 100, 0.8, 2, // car, high score -> keep
      20, 20, 200, 200, 0.1, 2, // car, low score -> drop
      30, 30, 300, 300, 0.9, 0, // person, high score -> drop
    ]);
    
    const outputs = {
      output0: {
        dims: [1, 3, 6],
        data,
      }
    };
    
    const predictions = postProcessYolo(outputs, 640, 640, 0.5);
    expect(predictions).toHaveLength(1);
    expect(predictions[0].label).toBe('car');
    expect(predictions[0].score).toBeCloseTo(0.8);
  });

  it('should map bicycle to motorcycle and others correctly', () => {
    const data = new Float32Array([
      0, 0, 10, 10, 0.9, 1, // bicycle -> motorcycle
      0, 0, 10, 10, 0.9, 2, // car -> car
      0, 0, 10, 10, 0.9, 3, // motorcycle -> motorcycle
      0, 0, 10, 10, 0.9, 5, // bus -> bus
      0, 0, 10, 10, 0.9, 7, // truck -> truck
    ]);
    
    const outputs = {
      output0: {
        dims: [1, 5, 6],
        data,
      }
    };
    
    const predictions = postProcessYolo(outputs, 640, 640, 0.5);
    expect(predictions).toHaveLength(5);
    expect(predictions.map(p => p.label)).toEqual(['motorcycle', 'car', 'motorcycle', 'bus', 'truck']);
  });

  it('should normalize coordinates to 640', () => {
    const data = new Float32Array([
      320, 160, 640, 480, 0.9, 2
    ]);
    
    const outputs = {
      output0: {
        dims: [1, 1, 6],
        data,
      }
    };
    
    const predictions = postProcessYolo(outputs, 640, 640, 0.5);
    expect(predictions[0].box).toEqual({
      xmin: 0.5,
      ymin: 0.25,
      xmax: 1.0,
      ymax: 0.75,
    });
  });

  it('should handle empty outputs', () => {
    const outputs = {};
    const predictions = postProcessYolo(outputs, 640, 640, 0.5);
    expect(predictions).toEqual([]);
  });
});
