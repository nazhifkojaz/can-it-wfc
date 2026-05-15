import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FollowButton from './FollowButton';
import { userApi } from '../../api/client';

vi.mock('../../api/client', () => ({
  userApi: {
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn() },
}));

describe('FollowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs local status when rendered for a different user', () => {
    const { rerender } = render(<FollowButton username="alice" followStatus="active" />);

    expect(screen.getByRole('button', { name: /unfollow/i })).toBeInTheDocument();

    rerender(<FollowButton username="bob" followStatus="none" />);

    expect(screen.getByRole('button', { name: /^follow$/i })).toBeInTheDocument();
  });

  it('allows pending follow requests to be cancelled', async () => {
    vi.mocked(userApi.unfollowUser).mockResolvedValue(undefined as never);

    render(<FollowButton username="alice" followStatus="pending" />);

    const button = screen.getByRole('button', { name: /cancel request/i });
    expect(button).not.toBeDisabled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(userApi.unfollowUser).toHaveBeenCalledWith('alice');
    });
    expect(screen.getByRole('button', { name: /^follow$/i })).toBeInTheDocument();
  });
});
