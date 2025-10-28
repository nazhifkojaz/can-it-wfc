import React from 'react';
import { Search } from 'lucide-react';
import styles from './map.module.css';

interface SearchAreaButtonProps {
  onClick: () => void;
  loading?: boolean;
  cafeCount?: number | null;
}

const SearchAreaButton: React.FC<SearchAreaButtonProps> = ({
  onClick,
  loading = false,
  cafeCount
}) => {
  return (
    <button
      className={styles.searchAreaButton}
      onClick={onClick}
      disabled={loading}
    >
      <Search size={16} />
      <span>
        {loading ? 'Searching...' : 'Search this area'}
      </span>
      {cafeCount !== null && cafeCount !== undefined && !loading && (
        <span className={styles.searchAreaBadge}>{cafeCount}</span>
      )}
    </button>
  );
};

export default SearchAreaButton;
