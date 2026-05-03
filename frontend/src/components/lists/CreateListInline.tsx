import React, { useState, useRef, useEffect } from 'react';
import styles from './Lists.module.css';

interface CreateListInlineProps {
  onConfirm: (name: string) => Promise<void>;
  onCancel: () => void;
  isCreating?: boolean;
}

const CreateListInline: React.FC<CreateListInlineProps> = ({ onConfirm, onCancel, isCreating }) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onConfirm(trimmed);
  };

  return (
    <form className={styles.createForm} onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        className={styles.createInput}
        placeholder="List name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        disabled={isCreating}
      />
      <div className={styles.createActions}>
        <button type="button" className={styles.btnSecondary} onClick={onCancel} disabled={isCreating}>
          Cancel
        </button>
        <button type="submit" className={styles.btnPrimary} disabled={!name.trim() || isCreating}>
          {isCreating ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default CreateListInline;
