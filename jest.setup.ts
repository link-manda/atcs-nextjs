import '@testing-library/jest-dom';

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(512 * 512 * 4),
      width: 512,
      height: 512,
    })),
    putImageData: jest.fn(),
    setLineDash: jest.fn(),
  })) as any;
}

// Global mock for @huggingface/transformers in Node test environment
jest.mock('@huggingface/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(jest.fn().mockResolvedValue([])),
  AutoModel: {
    from_pretrained: jest.fn().mockResolvedValue({
      __call__: jest.fn().mockResolvedValue([{ boxes: [], scores: [], classes: [] }])
    })
  },
  AutoProcessor: {
    from_pretrained: jest.fn().mockResolvedValue(jest.fn())
  },
  RawImage: {
    fromURL: jest.fn()
  },
  env: {
    allowLocalModels: false,
    useBrowserCache: false,
  },
}));

