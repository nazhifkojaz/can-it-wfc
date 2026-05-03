import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { CafeList } from '../../types';
import styles from './Lists.module.css';

interface ListCardProps {
  list: CafeList;
  onClick: (list: CafeList) => void;
}

const ListCard: React.FC<ListCardProps> = ({ list, onClick }) => (
  <div className={styles.listCard} onClick={() => onClick(list)}>
    <div className={styles.listCardInfo}>
      <p className={styles.listCardName}>
        {list.name}
        {list.is_default && <span className={styles.defaultBadge}>Default</span>}
      </p>
      <p className={styles.listCardCount}>
        {list.item_count} {list.item_count === 1 ? 'cafe' : 'cafes'}
      </p>
    </div>
    <ChevronRight size={18} color="var(--neo-gray-400)" />
  </div>
);

export default ListCard;
