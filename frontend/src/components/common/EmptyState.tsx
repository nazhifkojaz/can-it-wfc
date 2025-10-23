import React from 'react';
import { theme } from '../../config/theme';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <>
      <style>{`
        .empty-state-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: ${theme.spacing['3xl']} ${theme.spacing.lg};
          text-align: center;
        }

        .empty-state-icon {
          color: ${theme.colors.gray[400]};
          margin-bottom: ${theme.spacing.lg};
        }

        .empty-state-title {
          font-size: ${theme.typography.fontSize.xl};
          font-weight: ${theme.typography.fontWeight.semibold};
          color: ${theme.colors.text.primary};
          margin: 0 0 ${theme.spacing.sm} 0;
        }

        .empty-state-description {
          font-size: ${theme.typography.fontSize.base};
          color: ${theme.colors.text.secondary};
          margin: 0 0 ${theme.spacing.lg} 0;
          max-width: 400px;
        }

        .empty-state-action {
          background-color: ${theme.colors.primary};
          color: ${theme.colors.white};
          border: none;
          border-radius: ${theme.borderRadius.lg};
          padding: ${theme.spacing.md} ${theme.spacing.xl};
          font-size: ${theme.typography.fontSize.base};
          font-weight: ${theme.typography.fontWeight.medium};
          cursor: pointer;
          transition: background-color ${theme.transitions.fast};
        }

        .empty-state-action:hover {
          background-color: ${theme.colors.primaryHover};
        }

        .empty-state-action:active {
          transform: scale(0.98);
        }
      `}</style>

      <div className="empty-state-container">
        {icon && <div className="empty-state-icon">{icon}</div>}
        <h3 className="empty-state-title">{title}</h3>
        {description && <p className="empty-state-description">{description}</p>}
        {action && (
          <button className="empty-state-action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </>
  );
};

export default EmptyState;
