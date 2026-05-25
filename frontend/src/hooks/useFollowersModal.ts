import { useState, useCallback } from 'react';
import { usePanel } from '../contexts/PanelContext';

type FollowModalType = 'followers' | 'following';

export interface UseFollowersModalReturn {
  showFollowersModal: boolean;
  followModalType: FollowModalType;
  openFollowersModal: (type: FollowModalType) => void;
  closeFollowersModal: () => void;
  followersModalProps: {
    isOpen: boolean;
    onClose: () => void;
    type: FollowModalType;
    onUserClick: (clickedUsername: string) => void;
  };
}

export const useFollowersModal = (): UseFollowersModalReturn => {
  const { showPanel } = usePanel();
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<FollowModalType>('followers');

  const openFollowersModal = useCallback((type: FollowModalType) => {
    setFollowModalType(type);
    setShowFollowersModal(true);
  }, []);

  const closeFollowersModal = useCallback(() => {
    setShowFollowersModal(false);
  }, []);

  const handleUserClick = useCallback((clickedUsername: string) => {
    setShowFollowersModal(false);
    showPanel('userProfile', { username: clickedUsername });
  }, [showPanel]);

  return {
    showFollowersModal,
    followModalType,
    openFollowersModal,
    closeFollowersModal,
    followersModalProps: {
      isOpen: showFollowersModal,
      onClose: closeFollowersModal,
      type: followModalType,
      onUserClick: handleUserClick,
    },
  };
};
