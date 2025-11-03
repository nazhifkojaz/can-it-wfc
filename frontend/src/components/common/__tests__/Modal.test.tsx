/**
 * Tests for Modal component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '../Modal';

describe('Modal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('should display title when provided', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div>Content</div>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} showCloseButton={true}>
        <div>Content</div>
      </Modal>
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked and closeOnOverlayClick is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} closeOnOverlayClick={true}>
        <div>Content</div>
      </Modal>
    );

    const overlay = screen.getByRole('dialog').parentElement;
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should not call onClose when content is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <div>Content</div>
      </Modal>
    );

    const content = screen.getByText('Content');
    fireEvent.click(content);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should handle escape key when closeOnEscape is true', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} closeOnEscape={true}>
        <div>Content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should apply correct size class', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={mockOnClose} size="sm">
        <div>Content</div>
      </Modal>
    );

    let modalContent = screen.getByRole('dialog');
    expect(modalContent).toHaveStyle({ maxWidth: '400px' });

    rerender(
      <Modal isOpen={true} onClose={mockOnClose} size="lg">
        <div>Content</div>
      </Modal>
    );

    modalContent = screen.getByRole('dialog');
    expect(modalContent).toHaveStyle({ maxWidth: '800px' });
  });
});
