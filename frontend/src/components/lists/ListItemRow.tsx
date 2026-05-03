import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import type { CafeListItem } from '../../types';
import styles from './Lists.module.css';

interface ListItemRowProps {
  item: CafeListItem;
  onRemove: (cafeId: number) => Promise<void>;
  onUpdateNote: (cafeId: number, note: string) => Promise<unknown>;
  onCafeClick: (item: CafeListItem) => void;
}

const ListItemRow: React.FC<ListItemRowProps> = ({ item, onRemove, onUpdateNote, onCafeClick }) => {
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(item.note || '');
  const [isRemoving, setIsRemoving] = useState(false);

  const handleNoteBlur = async () => {
    setEditingNote(false);
    if (noteValue !== item.note) {
      await onUpdateNote(item.cafe.id, noteValue);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(item.cafe.id);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className={styles.itemRow}>
      <div className={styles.itemRowMain}>
        <div className={styles.itemCafeInfo} onClick={() => onCafeClick(item)}>
          <p className={styles.itemCafeName}>{item.cafe.name}</p>
          <p className={styles.itemCafeAddress}>
            <MapPin size={11} />
            {item.cafe.address}
          </p>
        </div>
        <button
          className={styles.itemRemoveBtn}
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label={`Remove ${item.cafe.name} from list`}
        >
          <X size={14} />
        </button>
      </div>

      <div className={styles.itemNote}>
        {editingNote ? (
          <input
            autoFocus
            className={styles.itemNoteInput}
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onBlur={handleNoteBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') { setNoteValue(item.note || ''); setEditingNote(false); }
            }}
            placeholder="Add a note..."
            maxLength={200}
          />
        ) : item.note ? (
          <span className={styles.itemNoteText} onClick={() => setEditingNote(true)}>
            "{item.note}"
          </span>
        ) : (
          <span className={styles.addNotePlaceholder} onClick={() => setEditingNote(true)}>
            + Add note
          </span>
        )}
      </div>
    </div>
  );
};

export default ListItemRow;
