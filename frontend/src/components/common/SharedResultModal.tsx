import React from 'react';
import ResultModal from './ResultModal';
import { UseResultModalReturn } from '../../hooks/useResultModal';

interface SharedResultModalProps {
  resultModal: UseResultModalReturn;
}

const SharedResultModal: React.FC<SharedResultModalProps> = ({ resultModal }) => (
  <ResultModal
    isOpen={resultModal.isOpen}
    onClose={resultModal.closeResultModal}
    type={resultModal.type}
    title={resultModal.title}
    message={resultModal.message}
    details={resultModal.details}
    primaryButton={resultModal.primaryButton}
    secondaryButton={resultModal.secondaryButton}
    autoClose={resultModal.autoClose}
    autoCloseDelay={resultModal.autoCloseDelay}
  />
);

export default SharedResultModal;
