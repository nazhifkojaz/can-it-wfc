import React from 'react';
import { Bookmark } from 'lucide-react';
import { useSavedLists } from '../../hooks/useSavedLists';
import { Loading, EmptyState } from '../common';
import ListCard from '../lists/ListCard';
import type { CafeList } from '../../types';
import styles from './SavedListsTab.module.css';

interface SavedListsTabProps {
  onListClick: (list: CafeList) => void;
}

const SavedListsTab: React.FC<SavedListsTabProps> = ({ onListClick }) => {
  const { lists, isLoading, isLoadingMore, error, loadMore, hasMore, refetch } = useSavedLists();

  if (isLoading) {
    return <Loading message="Loading saved lists..." />;
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <p>Couldn&apos;t load saved lists.</p>
        <button className={styles.retryBtn} onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark size={48} />}
        title="No saved lists yet"
        description="Save public lists from other users to find them here. Browse Discover to find lists worth saving."
      />
    );
  }

  return (
    <div className={styles.container}>
      {lists.map((list) => (
        <ListCard
          key={list.id}
          list={list}
          onClick={() => onListClick(list)}
        />
      ))}
      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <button
            className={styles.loadMoreBtn}
            onClick={() => loadMore()}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SavedListsTab;
