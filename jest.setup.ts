import '@testing-library/jest-dom';
import React from 'react';

jest.mock('react-player', () => {
  return function MockReactPlayer(props: any) {
    return React.createElement('div', { 'data-testid': 'mock-react-player', ...props });
  };
});

