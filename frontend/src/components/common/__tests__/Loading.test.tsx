/**
 * Tests for Loading component
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Loading from '../Loading';

describe('Loading', () => {
  it('should render spinner', () => {
    render(<Loading />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('should display message when provided', () => {
    render(<Loading message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should not display message when not provided', () => {
    const { container } = render(<Loading />);
    const message = container.querySelector('.loadingMessage');
    expect(message).not.toBeInTheDocument();
  });

  it('should apply fullscreen class when fullScreen is true', () => {
    render(<Loading fullScreen={true} />);
    expect(screen.getByTestId('loading-container').className).toMatch(/fullscreen/);
  });

  it('should not apply fullscreen class by default', () => {
    render(<Loading />);
    expect(screen.getByTestId('loading-container').className).not.toMatch(/fullscreen/);
  });

  it('should apply correct size', () => {
    const { rerender } = render(<Loading size="sm" />);
    let spinner = screen.getByTestId('spinner');
    expect(spinner.className).toMatch(/spinnerSm/);

    rerender(<Loading size="lg" />);
    spinner = screen.getByTestId('spinner');
    expect(spinner.className).toMatch(/spinnerLg/);
  });
});
