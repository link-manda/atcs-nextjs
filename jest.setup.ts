import '@testing-library/jest-dom';

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
  getImageData: jest.fn(() => ({ data: [] })),
  putImageData: jest.fn(),
  setLineDash: jest.fn(),
})) as any;

