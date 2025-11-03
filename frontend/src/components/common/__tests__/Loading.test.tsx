/**
 * Tests for Loading component
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Loading from '../Loading';

describe('Loading', () => {
  it('should render spinner', () => {
    const { container } = render(<Loading />);
    const spinner = container.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('should display message when provided', () => {
    render(<Loading message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should not display message when not provided', () => {
    const { container } = render(<Loading />);
    const message = container.querySelector('.loading-message');
    expect(message).not.toBeInTheDocument();
  });

  it('should apply fullscreen class when fullScreen is true', () => {
    const { container } = render(<Loading fullScreen={true} />);
    const loadingContainer = container.querySelector('.loading-container');
    expect(loadingContainer).toHaveClass('fullscreen');
  });

  it('should not apply fullscreen class by default', () => {
    const { container } = render(<Loading />);
    const loadingContainer = container.querySelector('.loading-container');
    expect(loadingContainer).not.toHaveClass('fullscreen');
  });

  it('should apply correct size', () => {
    const { container, rerender } = render(<Loading size="sm" />);
    let spinner = container.querySelector('.spinner');
    expect(spinner).toHaveStyle({ width: '24px', height: '24px' });

    rerender(<Loading size="lg" />);
    spinner = container.querySelector('.spinner');
    expect(spinner).toHaveStyle({ width: '60px', height: '60px' });
  });
});
