import React, { useState } from 'react';
import { Plus, BookMarked } from 'lucide-react';
import { useLists, useResultModal } from '../../hooks';
import { Loading, EmptyState, SharedResultModal } from '../common';
import type { CafeList, CafeListItem } from '../../types';
import ListCard from './ListCard';
import CreateListInline from './CreateListInline';
import ListView from './ListView';
import styles from './Lists.module.css';

interface ListsPanelProps {
  onCafeClick: (item: CafeListItem) => void;
}

const ListsPanel: React.FC<ListsPanelProps> = ({ onCafeClick }) => {
  const { lists, isLoading, createList, isCreating } = useLists();
  const resultModal = useResultModal();

  const [showCreate, setShowCreate] = useState(false);
  const [openListId, setOpenListId] = useState<number | null>(null);

  const handleCreate = async (name: string) => {
    try {
      await createList({ name });
      setShowCreate(false);
    } catch {
      resultModal.showResultModal({ type: 'error', title: 'Failed to Create', message: 'Could not create list. Please try again.' });
    }
  };

  if (openListId !== null) {
    return (
      <ListView
        listId={openListId}
        onBack={() => setOpenListId(null)}
        onCafeClick={onCafeClick}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.panelHeader}>
        <p className={styles.panelTitle}>
          {lists.length} {lists.length === 1 ? 'List' : 'Lists'}
        </p>
        {!showCreate && (
          <button className={styles.btnIcon} onClick={() => setShowCreate(true)}>
            <Plus size={14} />
            New List
          </button>
        )}
      </div>

      {showCreate && (
        <CreateListInline
          onConfirm={handleCreate}
          onCancel={() => setShowCreate(false)}
          isCreating={isCreating}
        />
      )}

      {isLoading ? (
        <Loading message="Loading lists..." />
      ) : lists.length === 0 && !showCreate ? (
        <EmptyState
          icon={<BookMarked size={48} />}
          title="No lists yet"
          description='Save cafes to lists using the bookmark button on any cafe, or create a list above.'
        />
      ) : (
        <div className={styles.container}>
          {lists.map((list: CafeList) => (
            <ListCard
              key={list.id}
              list={list}
              onClick={(l) => setOpenListId(l.id)}
            />
          ))}
        </div>
      )}

      <SharedResultModal resultModal={resultModal} />
    </div>
  );
};

export default ListsPanel;
