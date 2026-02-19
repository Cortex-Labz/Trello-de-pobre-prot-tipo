import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardService } from '../services/boardService';
import { cardService } from '../services/cardService';
import { listService } from '../services/listService';
import { Card, List } from '../types';
import { useConfirmModal } from '../hooks/useConfirmModal';

interface ArchivedItemsModalProps {
  boardId: string;
  onClose: () => void;
}

export default function ArchivedItemsModal({ boardId, onClose }: ArchivedItemsModalProps) {
  const queryClient = useQueryClient();
  const { confirm: confirmAction, ConfirmDialog } = useConfirmModal();
  const [activeTab, setActiveTab] = useState<'cards' | 'lists'>('cards');

  const { data, isLoading } = useQuery({
    queryKey: ['archived-items', boardId],
    queryFn: () => boardService.getArchivedItems(boardId),
  });

  const restoreCardMutation = useMutation({
    mutationFn: (cardId: string) => cardService.archiveCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-items', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => cardService.deleteCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-items', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const restoreListMutation = useMutation({
    mutationFn: (listId: string) => listService.archiveList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-items', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (listId: string) => listService.deleteList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archived-items', boardId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--overlay-bg)' }}>
      <div
        className="rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        style={{
          background: 'var(--surface-primary)',
          backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-xl font-semibold">Itens Arquivados</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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

        {/* Tabs */}
        <div
          className="flex border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'cards'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Cards ({data?.cards?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('lists')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'lists'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Listas ({data?.lists?.length || 0})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : activeTab === 'cards' ? (
            <div className="space-y-3">
              {data?.cards && data.cards.length > 0 ? (
                data.cards.map((card: Card & { list: { id: string; title: string } }) => (
                  <div
                    key={card.id}
                    className="p-4 rounded-lg border flex items-start justify-between gap-4"
                    style={{
                      background: 'var(--surface-secondary)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium mb-1">{card.title}</h3>
                      {card.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {card.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Lista: {card.list.title}</span>
                        {card.labels && card.labels.length > 0 && (
                          <div className="flex gap-1">
                            {card.labels.map((cl) => (
                              <span
                                key={cl.label.id}
                                className="px-2 py-1 rounded text-white"
                                style={{ backgroundColor: cl.label.color }}
                              >
                                {cl.label.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => restoreCardMutation.mutate(card.id)}
                        disabled={restoreCardMutation.isPending}
                        className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={async () => {
                          const confirmed = await confirmAction({
                            title: 'Excluir permanentemente',
                            message: 'Tem certeza que deseja excluir permanentemente este card? Esta acao nao pode ser desfeita.',
                            confirmText: 'Excluir',
                            variant: 'danger',
                          });
                          if (confirmed) {
                            deleteCardMutation.mutate(card.id);
                          }
                        }}
                        disabled={deleteCardMutation.isPending}
                        className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum card arquivado
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.lists && data.lists.length > 0 ? (
                data.lists.map((list: List & { cards?: Card[] }) => (
                  <div
                    key={list.id}
                    className="p-4 rounded-lg border flex items-start justify-between gap-4"
                    style={{
                      background: 'var(--surface-secondary)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium mb-1">{list.title}</h3>
                      <div className="text-xs text-gray-500">
                        {list.cards && list.cards.length > 0
                          ? `${list.cards.length} card(s) nesta lista`
                          : 'Lista vazia'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => restoreListMutation.mutate(list.id)}
                        disabled={restoreListMutation.isPending}
                        className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Restaurar
                      </button>
                      <button
                        onClick={async () => {
                          const confirmed = await confirmAction({
                            title: 'Excluir lista',
                            message: 'Tem certeza que deseja excluir permanentemente esta lista e todos os seus cards?',
                            confirmText: 'Excluir',
                            variant: 'danger',
                          });
                          if (confirmed) {
                            deleteListMutation.mutate(list.id);
                          }
                        }}
                        disabled={deleteListMutation.isPending}
                        className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma lista arquivada
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
}
