import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import * as nextThemes from 'next-themes';

jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

describe('ThemeToggle', () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sun icon and toggles to light mode when theme is dark', () => {
    (nextThemes.useTheme as jest.Mock).mockReturnValue({
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
    });

    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /Beralih ke Mode Terang/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('renders moon icon and toggles to dark mode when theme is light', () => {
    (nextThemes.useTheme as jest.Mock).mockReturnValue({
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    });

    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /Beralih ke Mode Gelap/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
