import React, { useState } from 'react';
import { ArrowLeft, Edit2, Trash2, Check, X } from 'lucide-react';
import { useListDetail, useLists, useResultModal } from '../../hooks';
import { Loading, EmptyState, ConfirmDialog, SharedResultModal } from '../common';
import type { CafeListItem } from '../../types';
import ListItemRow from './ListItemRow';
import styles from './Lists.module.css';

interface ListViewProps {
  listId: number;
  onBack: () => void;
  onCafeClick: (item: CafeListItem) => void;
}

const ListView: React.FC<ListViewProps> = ({ listId, onBack, onCafeClick }) => {
  const { list, isLoading, removeItem, updateNote } = useListDetail(listId);
  const { updateList, deleteList, isUpdating, isDeleting } = useLists();
  const resultModal = useResultModal();

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const startRename = () => {
    setRenameValue(list?.name || '');
    setRenaming(true);
  };

  const commitRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === list?.name) {
      setRenaming(false);
      return;
    }
    try {
      await updateList(listId, { name: trimmed });
    } catch {
      resultModal.showResultModal({ type: 'error', title: 'Failed to Rename', message: 'Could not rename list. Please try again.' });
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteList(listId);
      setShowDeleteConfirm(false);
      onBack();
    } catch {
      resultModal.showResultModal({ type: 'error', title: 'Failed to Delete', message: 'Could not delete list. Please try again.' });
    }
  };

  if (isLoading || !list) {
    return <Loading message="Loading list..." />;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.listViewHeader}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back to lists">
          <ArrowLeft size={16} />
        </button>

        {renaming ? (
          <div className={styles.renameForm}>
            <input
              autoFocus
              className={styles.renameInput}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              maxLength={100}
            />
            <button className={styles.btnIcon} onClick={commitRename} disabled={isUpdating} aria-label="Save name">
              <Check size={14} />
            </button>
            <button className={styles.btnIcon} onClick={() => setRenaming(false)} aria-label="Cancel">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className={styles.listViewTitleArea}>
            <p className={styles.listViewTitle}>{list.name}</p>
            <p className={styles.listViewSubtitle}>
              {list.item_count} {list.item_count === 1 ? 'cafe' : 'cafes'}
              {list.is_default && ' · Default List'}
            </p>
          </div>
        )}

        {!renaming && (
          <div className={styles.listViewHeaderActions}>
            {!list.is_default && (
              <button className={styles.btnIcon} onClick={startRename} aria-label="Rename list">
                <Edit2 size={14} />
              </button>
            )}
            {!list.is_default && (
              <button className={styles.btnDanger} onClick={() => setShowDeleteConfirm(true)} aria-label="Delete list">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      {list.items.length === 0 ? (
        <EmptyState
          title="No cafes yet"
          description="Add cafes to this list using the heart button on any cafe."
        />
      ) : (
        <div className={styles.itemsList}>
          {list.items.map((item) => (
            <ListItemRow
              key={item.cafe.id}
              item={item}
              onRemove={removeItem}
              onUpdateNote={updateNote}
              onCafeClick={onCafeClick}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete List?"
        message={<>Delete <strong>{list.name}</strong>? This cannot be undone.</>}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
        isLoading={isDeleting}
      />

      <SharedResultModal resultModal={resultModal} />
    </div>
  );
};

export default ListView;
