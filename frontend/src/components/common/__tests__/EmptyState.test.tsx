/**
 * Tests for EmptyState component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmptyState from '../EmptyState';
import { Coffee } from 'lucide-react';

describe('EmptyState', () => {
  it('should render title', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <EmptyState
        title="No items"
        description="Try adjusting your filters"
      />
    );
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(
      <EmptyState title="No cafes" icon={<Coffee data-testid="coffee-icon" />} />
    );
    expect(screen.getByTestId('coffee-icon')).toBeInTheDocument();
  });

  it('should render action button when provided', () => {
    const mockAction = jest.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add Item', onClick: mockAction }}
      />
    );

    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('should not render action button when not provided', () => {
    const { container } = render(<EmptyState title="No items" />);
    const button = container.querySelector('.empty-state-action');
    expect(button).not.toBeInTheDocument();
  });
});
