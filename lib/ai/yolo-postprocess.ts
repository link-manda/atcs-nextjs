export interface Box {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface YoloPrediction {
  box: Box;
  score: number;
  label: string;
}

export function postProcessYolo(
  outputs: any,
  originalWidth: number,
  originalHeight: number,
  threshold: number
): YoloPrediction[] {
  const predictions: YoloPrediction[] = [];
  
  // yolo outputs often come out as a single tensor [1, 300, 6]
  // where the last dimension is [xmin, ymin, xmax, ymax, score, class_id]
  let boxesTensor: any = null;
  for (const key in outputs) {
    if (outputs[key] && outputs[key].dims) {
      boxesTensor = outputs[key];
      break;
    }
  }
  
  if (!boxesTensor) return predictions;
  
  const dims = boxesTensor.dims;
  if (dims.length === 3 && dims[2] === 6) {
    const numBoxes = dims[1];
    const data = boxesTensor.data;
    
    for (let i = 0; i < numBoxes; i++) {
      const offset = i * 6;
      const xmin = data[offset];
      const ymin = data[offset + 1];
      const xmax = data[offset + 2];
      const ymax = data[offset + 3];
      const score = data[offset + 4];
      const classId = data[offset + 5];
      
      if (score >= threshold) {
        // Find label for class id. 
        // 1=bicycle, 2=car, 3=motorcycle, 5=bus, 7=truck in standard COCO
        let label = "unknown";
        if (classId === 1 || classId === 3) label = "motorcycle";
        else if (classId === 2) label = "car";
        else if (classId === 5) label = "bus";
        else if (classId === 7) label = "truck";
        
        if (label !== "unknown") {
          // Keep coordinates as model output (which usually is absolute pixels of the 640x640 model input).
          // We normalize them here based on 640.
          predictions.push({
            box: {
              xmin: Math.max(0, Math.min(1, xmin / 640)),
              ymin: Math.max(0, Math.min(1, ymin / 640)),
              xmax: Math.max(0, Math.min(1, xmax / 640)),
              ymax: Math.max(0, Math.min(1, ymax / 640)),
            },
            score,
            label,
          });
        }
      }
    }
  }
  
  return predictions;
}
