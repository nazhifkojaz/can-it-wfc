import React, { useState, useRef, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import { useCafeLists, useLists } from '../../hooks';
import styles from './SaveToListPopover.module.css';

interface SaveToListPopoverProps {
  cafeId: number;
  onClose: () => void;
}

const SaveToListPopover: React.FC<SaveToListPopoverProps> = ({ cafeId, onClose }) => {
  const { memberships, toggleInList, isToggling } = useCafeLists(cafeId);
  const { createList, isCreating } = useLists();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingListId, setPendingListId] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleToggle = async (listId: number, inList: boolean) => {
    setPendingListId(listId);
    try {
      await toggleInList(listId, inList);
    } finally {
      setPendingListId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    await createList({ name: trimmed });
    setNewName('');
    setShowCreate(false);
  };

  const sortedMemberships = [...memberships].sort((a, b) => {
    if (a.is_default) return -1;
    if (b.is_default) return 1;
    return 0;
  });

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.popover} ref={popoverRef}>
        <p className={styles.popoverHeader}>Save to List</p>

        <div className={styles.listRows}>
          {sortedMemberships.map((m) => {
            const isPending = pendingListId === m.id;
            return (
              <div
                key={m.id}
                className={`${styles.listRow} ${isPending ? styles.saving : ''}`}
                onClick={() => !isToggling && handleToggle(m.id, m.in_list)}
              >
                <div className={`${styles.checkbox} ${m.in_list ? styles.checked : ''}`}>
                  {m.in_list && <Check size={12} color="white" strokeWidth={3} />}
                </div>
                <div className={styles.listRowInfo}>
                  <p className={styles.listRowName}>{m.name}</p>
                </div>
                {m.is_default && <span className={styles.defaultDot} />}
              </div>
            );
          })}
        </div>

        <div className={styles.popoverFooter}>
          {showCreate ? (
            <form className={styles.createForm} onSubmit={handleCreate}>
              <input
                autoFocus
                className={styles.createInput}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New list name..."
                maxLength={100}
                disabled={isCreating}
              />
              <div className={styles.createActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={!newName.trim() || isCreating}>
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          ) : (
            <button className={styles.createToggleBtn} onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              New List
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SaveToListPopover;
