import React from 'react';
import { Search } from 'lucide-react';
import styles from './map.module.css';

interface SearchButtonProps {
  onClick: () => void;
}

const SearchButton: React.FC<SearchButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className={styles.mapControlButton}
      aria-label="Search cafes"
      title="Search cafes"
    >
      <Search size={20} />
    </button>
  );
};

export default SearchButton;
