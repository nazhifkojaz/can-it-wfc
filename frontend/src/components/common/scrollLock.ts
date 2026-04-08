let lockCount = 0;

export const lockBodyScroll = () => {
  if (++lockCount === 1) {
    document.body.style.overflow = 'hidden';
  }
};

export const unlockBodyScroll = () => {
  if (lockCount > 0 && --lockCount === 0) {
    document.body.style.overflow = '';
  }
};
