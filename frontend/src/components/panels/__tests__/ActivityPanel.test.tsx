/**
 * Tests for ActivityPanel component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActivityPanel from '../ActivityPanel';

// Mock contexts
const mockHidePanel = vi.fn();
const mockShowPanel = vi.fn();

vi.mock('../../../contexts/PanelContext', () => ({
  usePanel: () => ({
    hidePanel: mockHidePanel,
    showPanel: mockShowPanel,
  }),
}));

let mockUser: { id: number; username: string } | null = { id: 1, username: 'testuser' };

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock API
const mockGetActivityFeed = vi.fn();
vi.mock('../../../api/client', () => ({
  userApi: {
    getActivityFeed: (...args: any[]) => mockGetActivityFeed(...args),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock analytics
vi.mock('../../../lib/analytics', () => ({
  trackActivityItemClicked: vi.fn(),
  trackUserProfileViewed: vi.fn(),
}));

const mockActivities = {
  activities: [
    {
      id: '1',
      type: 'own_visit',
      cafe_id: 10,
      cafe_name: 'Test Cafe',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'own_review',
      cafe_id: 20,
      cafe_name: 'Another Cafe',
      wfc_rating: 4,
      comment: 'Great coffee',
      created_at: new Date().toISOString(),
    },
  ],
};

describe('ActivityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 1, username: 'testuser' };
    mockGetActivityFeed.mockResolvedValue(mockActivities);
  });

  it('should render refresh button', async () => {
    render(<ActivityPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Refresh activity')).toBeInTheDocument();
    });
  });

  it('should call fetchFeed when refresh button is clicked', async () => {
    render(<ActivityPanel />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockGetActivityFeed).toHaveBeenCalledTimes(1);
    });

    // Click refresh
    fireEvent.click(screen.getByLabelText('Refresh activity'));

    await waitFor(() => {
      expect(mockGetActivityFeed).toHaveBeenCalledTimes(2);
    });
  });

  it('should disable refresh button while loading', async () => {
    // Make the API call hang so loading stays true
    let resolveFetch: (value: any) => void;
    mockGetActivityFeed.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));

    render(<ActivityPanel />);

    const refreshButton = screen.getByLabelText('Refresh activity');
    expect(refreshButton).toBeDisabled();

    // Resolve the pending fetch
    resolveFetch!(mockActivities);

    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled();
    });
  });

  it('should show spin animation while loading', async () => {
    let resolveFetch: (value: any) => void;
    mockGetActivityFeed.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));

    render(<ActivityPanel />);

    const refreshIcon = screen.getByLabelText('Refresh activity').querySelector('svg');
    expect(refreshIcon).toHaveClass('spin');

    // Resolve fetch
    resolveFetch!(mockActivities);

    await waitFor(() => {
      expect(refreshIcon).not.toHaveClass('spin');
    });
  });
});
