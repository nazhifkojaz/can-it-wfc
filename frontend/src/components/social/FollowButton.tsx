import React, { useState } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { userApi } from '../../api/client';
import { extractApiError } from '../../utils/errorUtils';
import styles from './FollowButton.module.css';

interface FollowButtonProps {
  username: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  onError?: (error: Error) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  username,
  isFollowing: initialIsFollowing,
  onFollowChange,
  onError
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
      } else {
        await userApi.followUser(username);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
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
