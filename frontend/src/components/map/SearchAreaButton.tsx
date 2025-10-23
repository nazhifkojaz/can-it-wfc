import React from 'react';
import { Search } from 'lucide-react';

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
      className="search-area-button"
      onClick={onClick}
      disabled={loading}
    >
      <Search size={16} />
      <span>
        {loading ? 'Searching...' : 'Search this area'}
      </span>
      {cafeCount !== null && cafeCount !== undefined && !loading && (
        <span className="badge">{cafeCount}</span>
      )}

      <style>{`
        .search-area-button {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;

          display: flex;
          align-items: center;
          gap: 8px;

          background: white;
          border: none;
          border-radius: 24px;
          padding: 10px 20px;

          font-size: 14px;
          font-weight: 500;
          color: #333;

          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: all 0.2s ease;

          animation: slideDown 0.3s ease;
        }

        .search-area-button:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transform: translateX(-50%) translateY(-2px);
        }

        .search-area-button:active:not(:disabled) {
          transform: translateX(-50%) translateY(0);
        }

        .search-area-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .search-area-button .badge {
          background: var(--primary, #007bff);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @media (max-width: 768px) {
          .search-area-button {
            font-size: 13px;
            padding: 8px 16px;
          }
        }
      `}</style>
    </button>
  );
};

export default SearchAreaButton;
