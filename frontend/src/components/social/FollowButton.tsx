import React, { useState } from 'react';
import { UserPlus, UserMinus, Clock } from 'lucide-react';
import { userApi } from '../../api/client';
import { extractApiError } from '../../utils/errorUtils';
import { logger } from '../../utils/logger';
import { trackUserFollowed, trackUserUnfollowed } from '../../lib/analytics';
import styles from './FollowButton.module.css';

type FollowSource =
  | 'user_profile_modal'
  | 'user_profile_panel'
  | 'review_card'
  | 'followers_modal';

interface FollowButtonProps {
  username: string;
  isFollowing?: boolean;
  followStatus?: 'none' | 'active' | 'pending' | 'rejected';
  onFollowChange?: (isFollowing: boolean) => void;
  onStatusChange?: (status: 'none' | 'active' | 'pending' | 'rejected') => void;
  onError?: (error: Error) => void;
  source?: FollowSource;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  username,
  isFollowing: initialIsFollowing,
  followStatus: initialFollowStatus,
  onFollowChange,
  onStatusChange,
  onError,
  source = 'review_card',
}) => {
  const [loading, setLoading] = useState(false);
  const [followStatus, setFollowStatus] = useState(initialFollowStatus || (initialIsFollowing ? 'active' : 'none'));

  const handleToggleFollow = async () => {
    setLoading(true);
    try {
      if (followStatus === 'active') {
        await userApi.unfollowUser(username);
        setFollowStatus('none');
        onFollowChange?.(false);
        onStatusChange?.('none');
        trackUserUnfollowed({ targetUsername: username });
      } else if (followStatus === 'pending') {
        await userApi.unfollowUser(username);
        setFollowStatus('none');
        onFollowChange?.(false);
        onStatusChange?.('none');
        trackUserUnfollowed({ targetUsername: username });
      } else {
        const response = await userApi.followUser(username);
        const newStatus = (response?.follow_status as 'none' | 'active' | 'pending' | 'rejected') || 'active';
        setFollowStatus(newStatus);
        onFollowChange?.(newStatus === 'active');
        onStatusChange?.(newStatus);
        if (newStatus === 'active') {
          trackUserFollowed({ targetUsername: username, source });
        }
      }
    } catch (error) {
      logger.error('Failed to toggle follow', error, 'FollowButton');
      const apiError = extractApiError(error);
      const errorObj = new Error(apiError.message);
      onError?.(errorObj);
    } finally {
      setLoading(false);
    }
  };

  const isRequested = followStatus === 'pending';
  const isActive = followStatus === 'active';

  return (
    <button
      className={`${styles.followButton} ${isActive ? styles.following : ''} ${isRequested ? styles.pending : ''}`}
      onClick={handleToggleFollow}
      disabled={loading || isRequested || followStatus === 'rejected'}
    >
      {isRequested ? (
        <>
          <Clock size={18} />
          Requested
        </>
      ) : isActive ? (
        <>
          <UserMinus size={18} />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus size={18} />
          Follow
        </>
      )}
    </button>
  );
};

export default FollowButton;
