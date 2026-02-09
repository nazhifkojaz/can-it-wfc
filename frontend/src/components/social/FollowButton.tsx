import React, { useState } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
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
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  onError?: (error: Error) => void;
  source?: FollowSource;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  username,
  isFollowing: initialIsFollowing,
  onFollowChange,
  onError,
  source = 'review_card',
}) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggleFollow = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await userApi.unfollowUser(username);
        setIsFollowing(false);
        onFollowChange?.(false);

        // Track analytics
        trackUserUnfollowed({ targetUsername: username });
      } else {
        await userApi.followUser(username);
        setIsFollowing(true);
        onFollowChange?.(true);

        // Track analytics
        trackUserFollowed({ targetUsername: username, source });
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

  return (
    <button
      className={`${styles.followButton} ${isFollowing ? styles.following : ''}`}
      onClick={handleToggleFollow}
      disabled={loading}
    >
      {isFollowing ? (
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
