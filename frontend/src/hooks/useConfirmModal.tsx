import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ConfirmModal from '../components/common/ConfirmModal';

export function useConfirmModal() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning';
    resolve?: (value: boolean) => void;
  }>({ isOpen: false, title: '', message: '' });

  const confirm = useCallback((options: {
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, isOpen: true, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(s => ({ ...s, isOpen: false }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState(s => ({ ...s, isOpen: false }));
  }, [state.resolve]);

  const ConfirmDialog = () => state.isOpen ? createPortal(
    <ConfirmModal
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />,
    document.body
  ) : null;

  return { confirm, ConfirmDialog };
}
