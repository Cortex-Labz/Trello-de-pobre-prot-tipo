import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      workspaceService.createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setName('');
      setDescription('');
      onClose();
    },
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
      });
    }
  };

  return createPortal(
    <div
      className="fixed animate-fade-in"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-8 max-w-md w-full animate-slide-up mx-4"
        style={{
          background: 'var(--surface-primary)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Criar Workspace
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:rotate-90"
            style={{
              background: 'var(--surface-secondary)',
              color: 'var(--text-secondary)',
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Nome do Workspace *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Meu Projeto"
              className="w-full px-4 py-3 rounded-xl transition-all"
              style={{
                background: 'var(--surface-secondary)',
                border: '2px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Descrição (opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste workspace..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl transition-all resize-none"
              style={{
                background: 'var(--surface-secondary)',
                border: '2px solid var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all"
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                color: 'white',
              }}
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Workspace'}
            </button>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-center" style={{ color: '#ef4444' }}>
              Erro ao criar workspace. Tente novamente.
            </p>
          )}
        </form>
      </div>
    </div>,
    document.body
  );
}
