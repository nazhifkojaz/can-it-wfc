import React, { useState } from 'react';
import { ArrowLeft, Edit2, Trash2, Check, X, Globe, Lock, Link, Copy, Bookmark } from 'lucide-react';
import { useListDetail, useLists, useResultModal } from '../../hooks';
import { useAuth } from '../../contexts/AuthContext';
import { useSaveList } from '../../hooks/useSaveList';
import { Loading, EmptyState, ConfirmDialog, SharedResultModal } from '../common';
import { buildAppPath } from '../../utils/url';
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
  const { user } = useAuth();
  const resultModal = useResultModal();

  const { isSaved, saveCount, toggle, isPending: isSaving, error: saveError } = useSaveList(
    listId,
    { initialSaved: list?.is_saved_by_user ?? false, initialSaveCount: list?.save_count ?? 0 }
  );

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const isOwner = !!(user && list?.owner?.id && user.id === list.owner.id);
  const isSpecialList = list?.list_type === 'to_go' || list?.list_type === 'favorites';

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

  const cycleVisibility = async () => {
    if (!list) return;
    const next: 'private' | 'shareable' | 'public' =
      list.visibility === 'private' ? 'shareable' :
      list.visibility === 'shareable' ? 'public' : 'private';
    try {
      await updateList(listId, { visibility: next });
    } catch {
      resultModal.showResultModal({ type: 'error', title: 'Failed to Update', message: 'Could not update list visibility. Please try again.' });
    }
  };

  const copyShareLink = async () => {
    if (!list) return;
    const base = `${window.location.origin}${buildAppPath(`/list/${listId}`)}`;
    const url = list.share_token ? `${base}?token=${list.share_token}` : base;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              {saveCount > 0 && ` · ${saveCount} saved`}
            </p>
            {saveError && (
              <p className={styles.saveError}>{saveError}</p>
            )}
          </div>
        )}

        {!renaming && (
          <div className={styles.listViewHeaderActions}>
            {isOwner && !isSpecialList && (
              <>
                <button
                  className={styles.btnIcon}
                  onClick={cycleVisibility}
                  disabled={isUpdating}
                  aria-label={
                    list.visibility === 'private' ? 'Private' :
                    list.visibility === 'shareable' ? 'Shareable' : 'Public'
                  }
                  title={
                    list.visibility === 'private' ? 'Make shareable' :
                    list.visibility === 'shareable' ? 'Make public' : 'Make private'
                  }
                >
                  {list.visibility === 'private' ? <Lock size={14} /> :
                   list.visibility === 'shareable' ? <Link size={14} /> :
                   <Globe size={14} />}
                </button>
                {list.visibility !== 'private' && (
                  <button
                    className={styles.copyBtn}
                    onClick={copyShareLink}
                    aria-label="Copy shareable link"
                    title={copied ? 'Copied!' : 'Copy shareable link'}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </>
            )}
            {!isOwner && user && (
              <button
                className={styles.btnIcon}
                onClick={toggle}
                disabled={isSaving}
                aria-label={isSaved ? 'Unsave list' : 'Save list'}
              >
                <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            )}
            {isOwner && !list.is_default && (
              <button className={styles.btnIcon} onClick={startRename} aria-label="Rename list">
                <Edit2 size={14} />
              </button>
            )}
            {isOwner && !list.is_default && (
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
