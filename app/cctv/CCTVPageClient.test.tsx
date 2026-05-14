import { render, screen, fireEvent } from '@testing-library/react';
import CCTVPageClient from './CCTVPageClient';
import { CCTVChannel } from '@/types/cctv';

const mockChannels: CCTVChannel[] = Array.from({ length: 20 }, (_, i) => ({
  cctv_id: i,
  ch_id: `ch-${i}`,
  ch_name: `Camera ${i}`,
  lat: -8.65,
  lng: 115.22,
  streaming_url: 'http://test.com/stream',
  player_type: 'iframe',
  region: 'Denpasar'
}));

// Mock dynamic import for Map
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Component = () => <div data-testid="mock-map">Mock Map</div>;
    return Component;
  },
}));

describe('CCTVPageClient', () => {
  it('caps selection at current layout maxSlots (current behavior)', () => {
    render(<CCTVPageClient channels={mockChannels} />);
    
    // Default layout 3x3 (max 9)
    // Selected initial 9 (0-8)
    
    // Check if Camera 9 is disabled in the sidebar
    // Cameras are inside Accordion, might need to open it or mock it
    // Actually CCTVSidebar renders them all if the Accordion is open.
    // Let's just try to find the button for "Camera 9"
    const cam9Button = screen.getByRole('button', { name: /Camera 9/i });
    expect(cam9Button).toBeDisabled();
  });
});
