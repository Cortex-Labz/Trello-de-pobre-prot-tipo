import { useState, memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { boardService } from '../services/boardService';
import { listService } from '../services/listService';
import { cardService } from '../services/cardService';
import { labelService } from '../services/labelService';
import { websocketService } from '../services/websocketService';
import { useAuthStore } from '../store/authStore';
import CardModal from '../components/CardModal';
import ArchivedItemsModal from '../components/ArchivedItemsModal';
import BoardMembersModal from '../components/BoardMembersModal';
import ThemeToggle from '../components/common/ThemeToggle';
import MainLayout from '../components/layout/MainLayout';
import type { Card } from '../types';

// Helper function to format completion time
const formatCompletionTime = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return '';

  if (minutes < 1) {
    // Menos de 1 minuto - mostrar em segundos
    const seconds = Math.round(minutes * 60);
    return `${seconds} seg`;
  } else if (minutes < 60) {
    // Menos de 1 hora - mostrar em minutos
    return `${Math.round(minutes)} min`;
  } else if (minutes < 1440) {
    // Menos de 1 dia - mostrar em horas e minutos
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  } else {
    // 1 dia ou mais - mostrar em dias e horas
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
};

// Memoized Card Component
const CardItem = memo(({ card, formatTime }: { card: Card; formatTime: (minutes: number | null | undefined) => string }) => {
  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4
          className="font-semibold text-sm leading-snug flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ color: 'var(--text-primary)' }}
          title={card.title}
        >
          {card.title}
          {card.completionTime && (
            <span
              className="ml-2 text-xs font-normal"
              style={{ color: '#10b981' }}
              title="Tempo de conclusão"
            >
              ⏱️ {formatTime(card.completionTime)}
            </span>
          )}
        </h4>

        {/* Due Date - Clock Icon */}
        {card.dueDate && (
          <div className="relative group flex-shrink-0">
            <div
              className="flex items-center justify-center w-5 h-5 transition-all hover:scale-110 cursor-pointer"
              style={{
                color: '#EAB308',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            {/* Custom Tooltip */}
            <div
              className="absolute top-full right-0 mt-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg"
              style={{ zIndex: 99999 }}
            >
              {new Date(card.dueDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              <div className="absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900 dark:border-b-gray-700"></div>
            </div>
          </div>
        )}
      </div>

      {card.description && (
        <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          {card.description}
        </p>
      )}

      {/* Card Cover Image */}
      {card.coverAttachmentId && card.attachments && (() => {
        const coverImage = card.attachments.find(att => att.id === card.coverAttachmentId);
        if (coverImage) {
          return (
            <div className="mt-2 rounded-lg overflow-hidden relative group">
              <img
                src={coverImage.url}
                alt={coverImage.name}
                className="w-full h-auto max-h-48 object-cover"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                Capa
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Card Footer */}
      {((card.labels?.length || 0) > 0 || (card.members?.length || 0) > 0) && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {card.labels.slice(0, 3).map((cl) => (
                <div
                  key={cl.label.id}
                  className="px-2 py-0.5 rounded text-white text-xs font-medium"
                  style={{ backgroundColor: cl.label.color }}
                  title={cl.label.name}
                >
                  {cl.label.name}
                </div>
              ))}
            </div>
          )}

          {/* Members */}
          {card.members && card.members.length > 0 && (
            <div className="flex -space-x-2 ml-auto">
              {card.members.slice(0, 3).map((cm) => (
                <div
                  key={cm.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-gray-200 dark:ring-gray-700"
                  style={{
                    background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                  }}
                  title={cm.user.name}
                >
                  {cm.user.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
});

CardItem.displayName = 'CardItem';

// Memoized List Component to prevent re-renders
const ListColumn = memo(
  ({
    list,
    showNewCard,
    newCardTitle,
    onShowNewCard,
    onNewCardTitleChange,
    onCreateCard,
    onCancelNewCard,
    isCreatingCard,
    draggingCardId,
    onCardClick,
    onCardContextMenu,
    onListMenuClick,
    onRenameList,
    searchTerm,
    highlightedCards,
  }: {
    list: any;
    showNewCard: boolean;
    newCardTitle: string;
    onShowNewCard: () => void;
    onNewCardTitleChange: (value: string) => void;
    onCreateCard: () => void;
    onCancelNewCard: () => void;
    isCreatingCard: boolean;
    draggingCardId: string | null;
    onCardClick: (card: Card) => void;
    onCardContextMenu: (e: React.MouseEvent, card: Card) => void;
    onListMenuClick: (e: React.MouseEvent, list: any) => void;
    onRenameList: (listId: string, newTitle: string) => void;
    searchTerm: string;
    highlightedCards: Set<string>;
  }) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(list.title);

    const handleStartEditing = () => {
      setIsEditingTitle(true);
      setEditedTitle(list.title);
    };

    const handleFinishEditing = () => {
      if (editedTitle.trim() && editedTitle !== list.title) {
        onRenameList(list.id, editedTitle.trim());
      } else {
        setEditedTitle(list.title);
      }
      setIsEditingTitle(false);
    };

    const handleCancelEditing = () => {
      setEditedTitle(list.title);
      setIsEditingTitle(false);
    };

    return (
      <div
        className="flex-shrink-0 w-72 rounded-xl overflow-hidden transition-all duration-300"
        style={{
          transform: 'none',
          background: 'var(--surface-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: list.backgroundColor
            ? `0 4px 20px -2px ${list.backgroundColor.includes('gradient')
                ? 'rgba(102, 126, 234, 0.15)'
                : list.backgroundColor + '40'}, 0 2px 8px var(--shadow-color)`
            : '0 2px 8px var(--shadow-color), 0 0 0 1px var(--border-color)',
        }}
      >
        <div
          className="flex flex-col max-h-full h-full"
        >
        {/* List Header */}
        <div
          className="px-4 py-3 group relative overflow-hidden"
          style={{
            background: 'transparent',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          {/* Barra colorida no topo */}
          {list.backgroundColor && (
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{
                background: list.backgroundColor,
              }}
            />
          )}

          <div className="flex items-center justify-between gap-2 relative z-10">
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleFinishEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFinishEditing();
                  }
                  if (e.key === 'Escape') {
                    handleCancelEditing();
                  }
                }}
                className="font-bold text-base flex-1 tracking-tight px-2 py-1 rounded-lg focus:outline-none"
                style={{
                  color: 'var(--text-primary)',
                  background: 'var(--surface-secondary)',
                  border: '2px solid var(--bg-gradient-start)',
                }}
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <h3
                className="font-bold text-base flex-1 tracking-tight cursor-pointer px-2 py-1 rounded-lg hover:bg-opacity-50 transition-all"
                style={{ color: 'var(--text-primary)' }}
                onClick={handleStartEditing}
                onDoubleClick={handleStartEditing}
                title="Clique para renomear"
              >
                {list.title}
              </h3>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onListMenuClick(e, list);
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 opacity-0 group-hover:opacity-100 hover:rotate-90"
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                color: 'var(--text-secondary)',
                background: 'var(--surface-secondary)',
              }}
            >
              {list.cards?.length || 0}
            </span>
          </div>
        </div>

        {/* Cards Container */}
        <Droppable droppableId={list.id} type="CARD">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5"
              style={{
                minHeight: '10px',
                background: snapshot.isDraggingOver ? 'var(--surface-hover)' : 'transparent',
                transition: 'background 0.2s ease',
              }}
            >
              {list.cards
                ?.filter((card: Card) => {
                  if (!searchTerm) return true;
                  const search = searchTerm.toLowerCase();
                  return (
                    card.title?.toLowerCase().includes(search) ||
                    card.description?.toLowerCase().includes(search) ||
                    card.labels?.some(cl => cl.label?.name?.toLowerCase().includes(search))
                  );
                })
                .map((card: Card, index: number) => {
                // Esconde o card da posição original quando está sendo arrastado
                const isBeingDragged = draggingCardId === card.id;

                const isHighlighted = highlightedCards.has(card.id);

                return (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(provided, snapshot) => (
                      <motion.div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        onClick={() => !snapshot.isDragging && onCardClick(card)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onCardContextMenu(e, card);
                        }}
                        className="rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.02] group"
                        style={{
                          ...provided.draggableProps.style,
                          background: 'var(--surface-secondary)',
                          border: isHighlighted
                            ? '2px solid rgba(102, 126, 234, 0.8)'
                            : '1px solid var(--border-color)',
                          boxShadow: snapshot.isDragging
                            ? '0 12px 32px rgba(0, 0, 0, 0.2)'
                            : isHighlighted
                            ? '0 0 20px rgba(102, 126, 234, 0.4), 0 1px 3px var(--shadow-color)'
                            : '0 1px 3px var(--shadow-color)',
                          opacity: isBeingDragged && !snapshot.isDragging ? 0 : 1,
                          pointerEvents: isBeingDragged && !snapshot.isDragging ? 'none' : 'auto',
                        }}
                        animate={!snapshot.isDragging && isHighlighted ? {
                          scale: [1, 1.03, 1],
                          transition: { duration: 0.5, ease: "easeInOut" }
                        } : {}}
                      >
                        <CardItem card={card} formatTime={formatCompletionTime} />
                      </motion.div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {/* Add Card Button - Outside droppable so it gets pushed down */}
        <div className="px-3 pb-3">
          {showNewCard ? (
            <div
              className="rounded-lg p-3 shadow-sm"
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <textarea
                value={newCardTitle}
                onChange={(e) => onNewCardTitleChange(e.target.value)}
                placeholder="Digite o título do card..."
                className="w-full px-3 py-2 rounded-lg focus:outline-none resize-none text-sm"
                style={{
                  background: 'var(--surface-primary)',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--bg-gradient-start)',
                }}
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onCreateCard();
                  }
                  if (e.key === 'Escape') {
                    onCancelNewCard();
                  }
                }}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={onCreateCard}
                  disabled={!newCardTitle.trim() || isCreatingCard}
                  className="px-4 py-2 text-white rounded-lg transition-all text-sm font-semibold disabled:opacity-50 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                  }}
                >
                  Adicionar
                </button>
                <button
                  onClick={onCancelNewCard}
                  className="px-3 py-2 rounded-lg transition-all text-sm font-medium hover:scale-105"
                  style={{
                    color: 'var(--text-secondary)',
                    background: 'var(--surface-hover)',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onShowNewCard}
              className="w-full p-2.5 rounded-lg transition-all text-sm font-medium text-left flex items-center gap-2 hover:scale-[1.02] hover:shadow-sm"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent',
                border: '2px dashed var(--border-color)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar card
            </button>
          )}
        </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if cards changed or add card form state changed
    return (
      JSON.stringify(prevProps.list) === JSON.stringify(nextProps.list) &&
      prevProps.showNewCard === nextProps.showNewCard &&
      prevProps.newCardTitle === nextProps.newCardTitle &&
      prevProps.isCreatingCard === nextProps.isCreatingCard &&
      prevProps.draggingCardId === nextProps.draggingCardId &&
      prevProps.onCardClick === nextProps.onCardClick &&
      prevProps.onRenameList === nextProps.onRenameList
    );
  }
);

ListColumn.displayName = 'ListColumn';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const queryClient = useQueryClient();


  const [showNewList, setShowNewList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [showNewCard, setShowNewCard] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardMenuOpen, setCardMenuOpen] = useState<{ card: Card; x: number; y: number } | null>(null);
  const [listMenuOpen, setListMenuOpen] = useState<{ list: any; x: number; y: number } | null>(null);
  const [editingListColor, setEditingListColor] = useState<any | null>(null);
  const [editingCardTitle, setEditingCardTitle] = useState<{ cardId: string; title: string } | null>(null);
  const [cardDateDropdownOpen, setCardDateDropdownOpen] = useState<Card | null>(null);
  const [cardCoverDropdownOpen, setCardCoverDropdownOpen] = useState<Card | null>(null);
  const [cardMembersDropdownOpen, setCardMembersDropdownOpen] = useState<Card | null>(null);
  const [cardLabelsDropdownOpen, setCardLabelsDropdownOpen] = useState<Card | null>(null);
  const [dateInputValue, setDateInputValue] = useState('');
  const [customColor, setCustomColor] = useState('#667eea');
  const [savedColors, setSavedColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('savedListColors');
    return saved ? JSON.parse(saved) : [];
  });
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [backgroundType, setBackgroundType] = useState<'color' | 'image'>('color');
  const [customBoardColor, setCustomBoardColor] = useState('#0079bf');
  const [highlightedCards, setHighlightedCards] = useState<Set<string>>(new Set());

  // Track local actions to prevent duplicate updates from WebSocket
  const localActionInProgress = useRef(false);

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoard(boardId!),
    enabled: !!boardId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity, // Never mark as stale
    gcTime: Infinity, // Never garbage collect
  });

  // Abrir modal do card automaticamente se vindo de uma notificação
  useEffect(() => {
    const cardId = searchParams.get('card');
    if (cardId && boardData?.board.lists) {
      // Buscar o card nas listas
      for (const list of boardData.board.lists) {
        const card = list.cards?.find((c: Card) => c.id === cardId);
        if (card) {
          setSelectedCard(card);
          // Remover o parâmetro da URL
          setSearchParams({});
          break;
        }
      }
    }
  }, [searchParams, boardData, setSearchParams]);

  // WebSocket - Real-time updates
  useEffect(() => {
    if (!boardId || !token) return;

    // Connect to WebSocket
    websocketService.connect(token);

    // Join this board's room
    websocketService.joinBoard(boardId);

    // Helper to highlight a card temporarily
    const highlightCard = (cardId: string) => {
      setHighlightedCards(prev => new Set(prev).add(cardId));
      setTimeout(() => {
        setHighlightedCards(prev => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
      }, 2000); // Remove highlight after 2 seconds
    };

    // Listen for card moved events
    const handleCardMoved = (movedCard: any) => {
      console.log('🔄 Card moved via WebSocket:', movedCard);

      // Ignore if local action is in progress
      if (localActionInProgress.current) {
        console.log('⏭️ Ignoring WebSocket event (local action in progress)');
        return;
      }

      // Highlight the moved card
      if (movedCard?.id) {
        highlightCard(movedCard.id);
      }

      // Invalidate queries to refresh the board
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    };

    // Listen for other events
    const handleCardCreated = (newCard: any) => {
      if (localActionInProgress.current) {
        return;
      }
      if (newCard?.id) {
        highlightCard(newCard.id);
      }
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    };

    const handleCardUpdated = (updatedCard: any) => {
      if (localActionInProgress.current) {
        return;
      }
      if (updatedCard?.id) {
        highlightCard(updatedCard.id);
      }
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    };

    const handleCardDeleted = () => {
      if (localActionInProgress.current) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    };

    const handleListCreated = () => {
      if (localActionInProgress.current) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    };

    const handleListUpdated = () => {
      if (localActionInProgress.current) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    };

    // Register listeners
    websocketService.onBoardEvent('card:moved', handleCardMoved);
    websocketService.onBoardEvent('card:created', handleCardCreated);
    websocketService.onBoardEvent('card:updated', handleCardUpdated);
    websocketService.onBoardEvent('card:deleted', handleCardDeleted);
    websocketService.onBoardEvent('list:created', handleListCreated);
    websocketService.onBoardEvent('list:updated', handleListUpdated);

    // Cleanup on unmount
    return () => {
      websocketService.offBoardEvent('card:moved', handleCardMoved);
      websocketService.offBoardEvent('card:created', handleCardCreated);
      websocketService.offBoardEvent('card:updated', handleCardUpdated);
      websocketService.offBoardEvent('card:deleted', handleCardDeleted);
      websocketService.offBoardEvent('list:created', handleListCreated);
      websocketService.offBoardEvent('list:updated', handleListUpdated);
      websocketService.leaveBoard(boardId);
    };
  }, [boardId, token, queryClient]);

  const createListMutation = useMutation({
    mutationFn: (data: { boardId: string; title: string; position: number }) =>
      listService.createList(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setShowNewList(false);
      setNewListTitle('');
    },
  });

  const createCardMutation = useMutation({
    mutationFn: (data: {
      listId: string;
      title: string;
      position: number;
    }) => cardService.createCard(data),
    onMutate: () => {
      localActionInProgress.current = true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setShowNewCard(null);
      setNewCardTitle('');
    },
    onSettled: () => {
      setTimeout(() => {
        localActionInProgress.current = false;
      }, 500);
    },
  });

  const moveCardMutation = useMutation({
    mutationFn: (data: { cardId: string; listId: string; position: number }) =>
      cardService.moveCard(data.cardId, { listId: data.listId, position: data.position }),
    onMutate: () => {
      // Mark that a local action is in progress
      localActionInProgress.current = true;
    },
    onSettled: () => {
      // Reset the flag after a short delay to allow WebSocket event to be ignored
      setTimeout(() => {
        localActionInProgress.current = false;
      }, 500);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => cardService.deleteCard(cardId),
    onMutate: () => {
      localActionInProgress.current = true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setCardMenuOpen(null);
    },
    onSettled: () => {
      setTimeout(() => {
        localActionInProgress.current = false;
      }, 500);
    },
  });

  const updateCardMutation = useMutation({
    mutationFn: (data: { cardId: string; updates: Partial<Card> }) =>
      cardService.updateCard(data.cardId, data.updates),
    onMutate: () => {
      localActionInProgress.current = true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setCardMenuOpen(null);
      setEditingCardTitle(null);
      setCardDateDropdownOpen(null);
      setCardCoverDropdownOpen(null);
      setCardMembersDropdownOpen(null);
      setCardLabelsDropdownOpen(null);
    },
    onSettled: () => {
      setTimeout(() => {
        localActionInProgress.current = false;
      }, 500);
    },
  });

  const duplicateCardMutation = useMutation({
    mutationFn: (cardId: string) => cardService.duplicateCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setCardMenuOpen(null);
    },
  });

  const archiveCardMutation = useMutation({
    mutationFn: (cardId: string) => cardService.archiveCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setCardMenuOpen(null);
    },
  });

  const addCardMemberMutation = useMutation({
    mutationFn: (data: { cardId: string; userId: string }) =>
      cardService.addMember(data.cardId, data.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const removeCardMemberMutation = useMutation({
    mutationFn: (data: { cardId: string; userId: string }) =>
      cardService.removeMember(data.cardId, data.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const addCardLabelMutation = useMutation({
    mutationFn: (data: { cardId: string; labelId: string }) =>
      labelService.addLabelToCard(data.cardId, data.labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const removeCardLabelMutation = useMutation({
    mutationFn: (data: { cardId: string; labelId: string }) =>
      labelService.removeLabelFromCard(data.cardId, data.labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (listId: string) => listService.deleteList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setListMenuOpen(null);
    },
  });

  const updateListMutation = useMutation({
    mutationFn: (data: { listId: string; updates: any }) =>
      listService.updateList(data.listId, data.updates),
    onMutate: async ({ listId, updates }) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });

      // Snapshot do valor anterior
      const previousBoard = queryClient.getQueryData(['board', boardId]);

      // Atualiza otimisticamente
      queryClient.setQueryData(['board', boardId], (old: any) => {
        if (!old?.board?.lists) return old;

        const newLists = old.board.lists.map((list: any) =>
          list.id === listId ? { ...list, ...updates } : list
        );

        return { ...old, board: { ...old.board, lists: newLists } };
      });

      return { previousBoard };
    },
    onError: (_err, _variables, context) => {
      // Reverte em caso de erro
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard);
      }
    },
    onSettled: () => {
      // Fecha os modais após a operação (sucesso ou erro)
      setListMenuOpen(null);
      setEditingListColor(null);
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: (data: { backgroundColor?: string; backgroundImageUrl?: string }) =>
      boardService.updateBoard(boardId!, data),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });
      const previousBoard = queryClient.getQueryData(['board', boardId]);

      queryClient.setQueryData(['board', boardId], (old: any) => {
        if (!old?.board) return old;
        return { ...old, board: { ...old.board, ...updates } };
      });

      return { previousBoard };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard);
      }
    },
    onSettled: () => {
      setShowBackgroundModal(false);
    },
  });

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListTitle.trim() && boardId) {
      const position = board?.lists?.length || 0;
      createListMutation.mutate({
        boardId,
        title: newListTitle,
        position,
      });
    }
  };

  const handleCreateCard = (listId: string) => {
    if (newCardTitle.trim()) {
      const list = board?.lists?.find((l) => l.id === listId);
      const position = list?.cards?.length || 0;
      createCardMutation.mutate({
        listId,
        title: newCardTitle,
        position,
      });
    }
  };

  const handleDragStart = (result: any) => {
    // Marca o card que está sendo arrastado como invisível
    setDraggingCardId(result.draggableId);
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Limpa o estado de dragging
    setDraggingCardId(null);

    // Dropped outside any list
    if (!destination) {
      return;
    }

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Immediately update UI (optimistic)
    queryClient.setQueryData(['board', boardId], (old: any) => {
      if (!old?.board?.lists) return old;

      // Find the card being moved
      const movedCard = old.board.lists
        .flatMap((l: any) => l.cards || [])
        .find((c: any) => c.id === draggableId);

      if (!movedCard) return old;

      // Create new lists array with card moved
      const newLists = old.board.lists.map((list: any) => {
        // Remove card from all lists first
        let cards = (list.cards || []).filter((c: any) => c.id !== draggableId);

        // Add card to destination list at the right position
        if (list.id === destination.droppableId) {
          cards = [...cards];
          cards.splice(destination.index, 0, { ...movedCard, listId: destination.droppableId });
        }

        return { ...list, cards };
      });

      return { ...old, board: { ...old.board, lists: newLists } };
    });

    // Then call API
    moveCardMutation.mutate({
      cardId: draggableId,
      listId: destination.droppableId,
      position: destination.index,
    });
  };

  const handleListMenuClick = (e: React.MouseEvent, list: any) => {
    e.stopPropagation();
    setListMenuOpen({ list, x: e.clientX, y: e.clientY });
  };

  const handleCardContextMenu = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation();
    setCardMenuOpen({ card, x: e.clientX, y: e.clientY });
  };

  const handleDeleteCard = (cardId: string) => {
    if (confirm('Tem certeza que deseja deletar este card?')) {
      deleteCardMutation.mutate(cardId);
    }
  };

  const handleStartEditingCardTitle = (card: Card) => {
    setEditingCardTitle({ cardId: card.id, title: card.title });
    setCardMenuOpen(null);
  };

  const handleSaveCardTitle = () => {
    if (editingCardTitle && editingCardTitle.title.trim()) {
      updateCardMutation.mutate({
        cardId: editingCardTitle.cardId,
        updates: { title: editingCardTitle.title },
      });
    }
  };

  const handleDuplicateCard = (cardId: string) => {
    duplicateCardMutation.mutate(cardId);
  };

  const handleArchiveCard = (cardId: string) => {
    archiveCardMutation.mutate(cardId);
  };

  const convertToMinutes = (value: number, unit: string): number => {
    switch (unit) {
      case 'seconds':
        return value / 60;
      case 'minutes':
        return value;
      case 'hours':
        return value * 60;
      case 'days':
        return value * 1440;
      default:
        return value;
    }
  };

  const formatDateToBR = (isoDate: string | null): string => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateToISO = (brDate: string): string | null => {
    const cleaned = brDate.replace(/\D/g, '');
    if (cleaned.length !== 8) return null;

    const day = cleaned.substring(0, 2);
    const month = cleaned.substring(2, 4);
    const year = cleaned.substring(4, 8);

    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
      return null;
    }

    // Criar um Date object e converter para ISO string
    const date = new Date(yearNum, monthNum - 1, dayNum, 12, 0, 0, 0);
    return date.toISOString();
  };

  const applyDateMask = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    let masked = cleaned;

    if (cleaned.length >= 2) {
      masked = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    }
    if (cleaned.length >= 4) {
      masked = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4) + '/' + cleaned.substring(4, 8);
    }

    return masked;
  };

  const handleOpenCardDateDropdown = (card: Card) => {
    setCardDateDropdownOpen(card);
    setDateInputValue(formatDateToBR(card.dueDate || null));
    setCardMenuOpen(null);
  };

  const handleOpenCardCoverDropdown = (card: Card) => {
    setCardCoverDropdownOpen(card);
    setCardMenuOpen(null);
  };

  const handleOpenCardMembersDropdown = (card: Card) => {
    setCardMembersDropdownOpen(card);
    setCardMenuOpen(null);
  };

  const handleOpenCardLabelsDropdown = (card: Card) => {
    setCardLabelsDropdownOpen(card);
    setCardMenuOpen(null);
  };

  const handleDeleteList = (listId: string) => {
    if (confirm('Tem certeza que deseja deletar esta lista?')) {
      deleteListMutation.mutate(listId);
    }
  };

  const handleChangeListColor = (list: any, color: string) => {
    updateListMutation.mutate({
      listId: list.id,
      updates: { backgroundColor: color },
    });
  };

  const handleRenameList = (listId: string, newTitle: string) => {
    updateListMutation.mutate({
      listId,
      updates: { title: newTitle },
    });
  };

  const handleSaveCustomColor = () => {
    const gradient = `linear-gradient(135deg, ${customColor} 0%, ${customColor} 100%)`;
    if (!savedColors.includes(gradient)) {
      const newSavedColors = [...savedColors, gradient];
      setSavedColors(newSavedColors);
      localStorage.setItem('savedListColors', JSON.stringify(newSavedColors));
    }
    handleChangeListColor(editingListColor, gradient);
  };

  const handleRemoveSavedColor = (colorToRemove: string) => {
    const newSavedColors = savedColors.filter(c => c !== colorToRemove);
    setSavedColors(newSavedColors);
    localStorage.setItem('savedListColors', JSON.stringify(newSavedColors));
  };

  const handleApplyBackgroundColor = (color: string) => {
    updateBoardMutation.mutate({ backgroundColor: color, backgroundImageUrl: undefined });
  };

  const handleApplyBackgroundImage = (imageUrl: string) => {
    updateBoardMutation.mutate({ backgroundColor: undefined, backgroundImageUrl: imageUrl });
  };

  const board = boardData?.board;
  const lists = board?.lists || [];

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
        }}
      >
        <div
          className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--surface-primary)' }}
        ></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
        }}
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Board não encontrado
          </h2>
          <Link
            to="/dashboard"
            className="font-medium"
            style={{ color: 'var(--bg-gradient-start)' }}
          >
            Voltar para Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getBoardBackground = () => {
    if (board?.backgroundImageUrl) {
      return {
        backgroundImage: `url(${board.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
    if (board?.backgroundColor) {
      return { background: board.backgroundColor };
    }
    return { background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)' };
  };

  return (
    <MainLayout>
      <div
        className="flex flex-col h-full p-6 relative"
        style={getBoardBackground()}
      >
        {/* Overlay para melhorar legibilidade quando há imagem de fundo */}
        {board?.backgroundImageUrl && (
          <div
            className="absolute inset-0 bg-black/20"
            style={{ zIndex: 0 }}
          />
        )}
        {/* Board Header */}
        <div
          className="mb-6 p-4 rounded-2xl shadow-lg relative z-10"
          style={{
            background: 'var(--surface-primary)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px var(--shadow-color)',
          }}
        >
          <div className="flex items-center gap-4">
            <Link
              to={`/workspace/${board.workspaceId}`}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:translate-x-[-4px]"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="flex-1">
              <h1
                className="text-2xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                {board.name}
              </h1>
              {board.description && (
                <span
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {board.description}
                </span>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex-shrink-0 w-64">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm transition-all focus:ring-2"
                  style={{
                    background: 'var(--surface-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2"
                  style={{ color: 'var(--text-tertiary)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowMembersModal(true)}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105 flex items-center gap-2"
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Membros
            </button>

            <button
              onClick={() => setShowBackgroundModal(true)}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105 flex items-center gap-2"
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Alterar Fundo
            </button>

            <button
              onClick={() => setShowArchivedModal(true)}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-105 flex items-center gap-2"
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Arquivados
            </button>
          </div>
        </div>

        {/* Board Content */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative z-10">
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full items-start pb-4">
            {/* Lists */}
            {lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                showNewCard={showNewCard === list.id}
                newCardTitle={newCardTitle}
                onShowNewCard={() => setShowNewCard(list.id)}
                onNewCardTitleChange={setNewCardTitle}
                onCreateCard={() => handleCreateCard(list.id)}
                onCancelNewCard={() => {
                  setShowNewCard(null);
                  setNewCardTitle('');
                }}
                isCreatingCard={createCardMutation.isPending}
                draggingCardId={draggingCardId}
                onCardClick={setSelectedCard}
                onCardContextMenu={handleCardContextMenu}
                onListMenuClick={handleListMenuClick}
                onRenameList={handleRenameList}
                searchTerm={searchTerm}
                highlightedCards={highlightedCards}
              />
            ))}

          {/* Add List */}
          {showNewList ? (
            <div
              className="flex-shrink-0 w-72 rounded-2xl p-4 shadow-lg"
              style={{
                background: 'var(--surface-primary)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--border-color)',
              }}
            >
              <form onSubmit={handleCreateList}>
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Digite o nome da lista..."
                  className="w-full px-4 py-2.5 rounded-xl focus:outline-none"
                  style={{
                    background: 'var(--surface-secondary)',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--bg-gradient-start)',
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowNewList(false);
                      setNewListTitle('');
                    }
                  }}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    type="submit"
                    disabled={!newListTitle.trim() || createListMutation.isPending}
                    className="px-4 py-2 text-white rounded-lg transition-all text-sm font-medium disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                    }}
                  >
                    Adicionar lista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewList(false);
                      setNewListTitle('');
                    }}
                    className="px-3 py-2 rounded-lg transition-colors text-sm"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-hover)',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setShowNewList(true)}
              className="flex-shrink-0 w-72 h-auto min-h-[120px] rounded-2xl p-4 transition-all flex items-center justify-center gap-2 font-medium shadow-lg"
              style={{
                background: 'var(--surface-primary)',
                backdropFilter: 'blur(10px)',
                border: '2px dashed var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar lista
            </button>
          )}
          </div>
        </DragDropContext>
        </div>

        {/* Card Modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          boardId={boardId!}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          availableLabels={board?.labels || []}
          boardMembers={board?.members || []}
        />
      )}

      {/* List Context Menu */}
      {listMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setListMenuOpen(null)}
          />
          <div
            className="fixed z-50 rounded-xl shadow-2xl p-2 min-w-[200px]"
            style={{
              top: `${listMenuOpen.y}px`,
              left: `${listMenuOpen.x}px`,
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <button
              onClick={() => {
                setEditingListColor(listMenuOpen.list);
                setListMenuOpen(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Alterar cor
            </button>
            <div className="my-1 h-px" style={{ background: 'var(--border-color)' }} />
            <button
              onClick={() => {
                handleDeleteList(listMenuOpen.list.id);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: '#ef4444',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Deletar lista
            </button>
          </div>
        </>
      )}

      {/* Color Picker Modal */}
      {editingListColor && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingListColor(null)}
          />
          <div
            className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl p-6 w-80"
            style={{
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Alterar Cor da Lista
              </h3>
              <button
                onClick={() => setEditingListColor(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:rotate-90"
                style={{
                  background: 'var(--surface-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Color Picker Customizado */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Personalizar Cor
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-16 h-12 rounded-xl cursor-pointer border-2"
                  style={{ borderColor: 'var(--border-color)' }}
                />
                <button
                  onClick={handleSaveCustomColor}
                  className="flex-1 px-4 py-2 rounded-xl font-medium transition-all hover:scale-105 text-white text-sm"
                  style={{
                    background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                  }}
                >
                  Salvar e Aplicar
                </button>
              </div>
            </div>

            {/* Cores Padrão */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Cores Padrão
              </label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
                  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                  'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
                  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
                  'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                ].map((color, index) => (
                  <button
                    key={index}
                    onClick={() => handleChangeListColor(editingListColor, color)}
                    className="w-full h-12 rounded-xl transition-all hover:scale-110 shadow-md"
                    style={{
                      background: color,
                      border: color.includes('0.05') ? '2px dashed var(--border-color)' : 'none',
                    }}
                    title={color.includes('0.05') ? 'Padrão' : 'Gradiente'}
                  >
                    {color.includes('0.05') && (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Padrão</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Cores Salvas */}
            {savedColors.length > 0 && (
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Minhas Cores Salvas
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {savedColors.map((color, index) => (
                    <div key={index} className="relative group">
                      <button
                        onClick={() => handleChangeListColor(editingListColor, color)}
                        className="w-full h-12 rounded-xl transition-all hover:scale-110 shadow-md"
                        style={{ background: color }}
                        title="Usar esta cor"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSavedColor(color);
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remover cor"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Card Context Menu */}
      {cardMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCardMenuOpen(null)}
          />
          <div
            className="fixed z-50 rounded-xl shadow-2xl p-2 min-w-[200px]"
            style={{
              top: `${cardMenuOpen.y}px`,
              left: `${cardMenuOpen.x}px`,
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => handleStartEditingCardTitle(cardMenuOpen.card)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Renomear
            </button>
            <button
              onClick={() => handleDuplicateCard(cardMenuOpen.card.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Duplicar
            </button>
            <button
              onClick={() => handleOpenCardDateDropdown(cardMenuOpen.card)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Editar data
            </button>
            <button
              onClick={() => handleOpenCardCoverDropdown(cardMenuOpen.card)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Alterar capa
            </button>
            <button
              onClick={() => handleOpenCardMembersDropdown(cardMenuOpen.card)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Alterar membro
            </button>
            <button
              onClick={() => handleOpenCardLabelsDropdown(cardMenuOpen.card)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Editar etiqueta
            </button>
            <button
              onClick={() => handleArchiveCard(cardMenuOpen.card.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Arquivar
            </button>
            <div className="my-1 h-px" style={{ background: 'var(--border-color)' }} />
            <button
              onClick={() => handleDeleteCard(cardMenuOpen.card.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm hover:translate-x-1"
              style={{
                color: '#ef4444',
                background: 'transparent',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Deletar card
            </button>
          </div>
        </>
      )}

      {/* Inline Card Title Editor */}
      {editingCardTitle && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingCardTitle(null)}
          />
          <div
            className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl p-6 w-96"
            style={{
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Renomear Card
            </h3>
            <input
              type="text"
              value={editingCardTitle.title}
              onChange={(e) => setEditingCardTitle({ ...editingCardTitle, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveCardTitle();
                } else if (e.key === 'Escape') {
                  setEditingCardTitle(null);
                }
              }}
              className="w-full px-3 py-2 rounded-lg border mb-4"
              style={{
                background: 'var(--surface-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingCardTitle(null)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--surface-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCardTitle}
                disabled={!editingCardTitle.title.trim()}
                className="px-4 py-2 rounded-lg transition-colors text-white disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Card Date Dropdown */}
      {cardDateDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCardDateDropdownOpen(null)}
          />
          <div
            className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl p-6 w-80"
            style={{
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Editar Data
            </h3>
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              value={dateInputValue}
              onChange={(e) => {
                const masked = applyDateMask(e.target.value);
                setDateInputValue(masked);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const isoDate = formatDateToISO(dateInputValue);
                  if (isoDate) {
                    updateCardMutation.mutate({
                      cardId: cardDateDropdownOpen.id,
                      updates: { dueDate: isoDate },
                    });
                  }
                } else if (e.key === 'Escape') {
                  setCardDateDropdownOpen(null);
                }
              }}
              maxLength={10}
              className="w-full px-3 py-2 rounded-lg border mb-2"
              style={{
                background: 'var(--surface-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Formato: dia/mês/ano
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  updateCardMutation.mutate({
                    cardId: cardDateDropdownOpen.id,
                    updates: { dueDate: null },
                  });
                }}
                className="flex-1 px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--surface-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Remover
              </button>
              <button
                onClick={() => {
                  const isoDate = formatDateToISO(dateInputValue);
                  if (isoDate) {
                    updateCardMutation.mutate({
                      cardId: cardDateDropdownOpen.id,
                      updates: { dueDate: isoDate },
                    });
                  }
                }}
                disabled={!formatDateToISO(dateInputValue)}
                className="flex-1 px-4 py-2 rounded-lg transition-colors text-white disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Card Cover Dropdown */}
      {cardCoverDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCardCoverDropdownOpen(null)}
          />
          <div
            className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl p-6 w-96 max-h-[80vh] overflow-y-auto"
            style={{
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Alterar Capa
            </h3>
            {cardCoverDropdownOpen.attachments && cardCoverDropdownOpen.attachments.length > 0 ? (
              <div className="space-y-2 mb-4">
                {cardCoverDropdownOpen.attachments.map((att: any) => (
                  <button
                    key={att.id}
                    onClick={() => {
                      cardService.setCover(cardCoverDropdownOpen.id, att.id);
                      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
                      setCardCoverDropdownOpen(null);
                    }}
                    className="w-full p-2 rounded-lg border transition-all hover:scale-105"
                    style={{
                      borderColor: cardCoverDropdownOpen.coverAttachmentId === att.id ? 'var(--bg-gradient-start)' : 'var(--border-color)',
                      background: 'var(--surface-secondary)',
                    }}
                  >
                    <img src={att.url} alt={att.name} className="w-full h-24 object-cover rounded" />
                    <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>{att.name}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Nenhum anexo disponível. Adicione anexos ao card para usá-los como capa.
              </p>
            )}
            <button
              onClick={() => {
                cardService.setCover(cardCoverDropdownOpen.id, null);
                queryClient.invalidateQueries({ queryKey: ['board', boardId] });
                setCardCoverDropdownOpen(null);
              }}
              className="w-full px-4 py-2 rounded-lg transition-colors mb-2"
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--text-secondary)',
              }}
            >
              Remover Capa
            </button>
            <button
              onClick={() => setCardCoverDropdownOpen(null)}
              className="w-full px-4 py-2 rounded-lg transition-colors text-white"
              style={{
                background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
              }}
            >
              Fechar
            </button>
          </div>
        </>
      )}

      {/* Card Members Dropdown */}
      {cardMembersDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCardMembersDropdownOpen(null)}
          />
          <div
            className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl p-6 w-80 max-h-[80vh] overflow-y-auto"
            style={{
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Membros
            </h3>
            {board?.members && board.members.length > 0 ? (
              <div className="space-y-2">
                {board.members.map((member: any) => {
                  const isAssigned = cardMembersDropdownOpen.members?.some((m: any) => m.user.id === member.user.id);
                  return (
                    <button
                      key={member.user.id}
                      onClick={() => {
                        if (isAssigned) {
                          removeCardMemberMutation.mutate({
                            cardId: cardMembersDropdownOpen.id,
                            userId: member.user.id,
                          });
                        } else {
                          addCardMemberMutation.mutate({
                            cardId: cardMembersDropdownOpen.id,
                            userId: member.user.id,
                          });
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-105"
                      style={{
                        background: isAssigned ? 'var(--bg-gradient-start)' : 'var(--surface-secondary)',
                        color: isAssigned ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'var(--bg-gradient-start)' }}>
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-left">{member.user.name}</span>
                      {isAssigned && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Nenhum membro disponível no board.
              </p>
            )}
            <button
              onClick={() => setCardMembersDropdownOpen(null)}
              className="w-full mt-4 px-4 py-2 rounded-lg transition-colors text-white"
              style={{
                background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
              }}
            >
              Fechar
            </button>
          </div>
        </>
      )}

      {/* Card Labels Dropdown */}
      {cardLabelsDropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setCardLabelsDropdownOpen(null)}
          />
          <div
            className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl p-6 w-80 max-h-[80vh] overflow-y-auto"
            style={{
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Etiquetas
            </h3>
            {board?.labels && board.labels.length > 0 ? (
              <div className="space-y-2">
                {board.labels.map((label: any) => {
                  const isAssigned = cardLabelsDropdownOpen.labels?.some((l: any) => l.label.id === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => {
                        if (isAssigned) {
                          removeCardLabelMutation.mutate({
                            cardId: cardLabelsDropdownOpen.id,
                            labelId: label.id,
                          });
                        } else {
                          addCardLabelMutation.mutate({
                            cardId: cardLabelsDropdownOpen.id,
                            labelId: label.id,
                          });
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-105"
                      style={{
                        background: label.color,
                        color: 'white',
                        opacity: isAssigned ? 1 : 0.6,
                      }}
                    >
                      <span className="flex-1 text-left font-medium">{label.name}</span>
                      {isAssigned && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Nenhuma etiqueta disponível. Crie etiquetas no board primeiro.
              </p>
            )}
            <button
              onClick={() => setCardLabelsDropdownOpen(null)}
              className="w-full mt-4 px-4 py-2 rounded-lg transition-colors text-white"
              style={{
                background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
              }}
            >
              Fechar
            </button>
          </div>
        </>
      )}

      {/* Background Customization Modal */}
      {showBackgroundModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowBackgroundModal(false)}
          />
          <div
            className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl p-6 w-[480px] max-h-[80vh] overflow-y-auto"
            style={{
              background: 'var(--surface-primary)',
              border: '1px solid var(--border-color)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Personalizar Fundo do Board
              </h3>
              <button
                onClick={() => setShowBackgroundModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:rotate-90"
                style={{
                  background: 'var(--surface-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setBackgroundType('color')}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: backgroundType === 'color' ? 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)' : 'var(--surface-secondary)',
                  color: backgroundType === 'color' ? 'white' : 'var(--text-secondary)',
                }}
              >
                Cores
              </button>
              <button
                onClick={() => setBackgroundType('image')}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: backgroundType === 'image' ? 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)' : 'var(--surface-secondary)',
                  color: backgroundType === 'image' ? 'white' : 'var(--text-secondary)',
                }}
              >
                Imagens
              </button>
            </div>

            {/* Color Tab */}
            {backgroundType === 'color' && (
              <div>
                {/* Custom Color Picker */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Personalizar Cor
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={customBoardColor}
                      onChange={(e) => setCustomBoardColor(e.target.value)}
                      className="w-20 h-14 rounded-xl cursor-pointer border-2"
                      style={{ borderColor: 'var(--border-color)' }}
                    />
                    <button
                      onClick={() => handleApplyBackgroundColor(`linear-gradient(135deg, ${customBoardColor} 0%, ${customBoardColor} 100%)`)}
                      className="flex-1 px-4 py-2 rounded-xl font-medium transition-all hover:scale-105 text-white text-sm"
                      style={{
                        background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                      }}
                    >
                      Aplicar Cor Personalizada
                    </button>
                  </div>
                </div>

                {/* Gradient Presets */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Gradientes Prontos
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'Trello Azul', gradient: 'linear-gradient(135deg, #0079bf 0%, #5e4db2 100%)' },
                      { name: 'Roxo Profundo', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                      { name: 'Rosa Vibrante', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
                      { name: 'Azul Céu', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
                      { name: 'Verde Água', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
                      { name: 'Pôr do Sol', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
                      { name: 'Oceano Profundo', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
                      { name: 'Pastel Suave', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
                      { name: 'Rosa Delicado', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
                      { name: 'Pêssego', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
                      { name: 'Coral Azul', gradient: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)' },
                      { name: 'Lavanda', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
                    ].map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => handleApplyBackgroundColor(preset.gradient)}
                        className="h-24 rounded-xl transition-all hover:scale-105 shadow-lg relative overflow-hidden group"
                        style={{ background: preset.gradient }}
                        title={preset.name}
                      >
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity px-2 text-center">
                            {preset.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Solid Colors */}
                <div className="mt-6">
                  <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Cores Sólidas
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {[
                      { name: 'Azul', color: '#0079bf' },
                      { name: 'Verde', color: '#61bd4f' },
                      { name: 'Amarelo', color: '#f2d600' },
                      { name: 'Laranja', color: '#ff9f1a' },
                      { name: 'Vermelho', color: '#eb5a46' },
                      { name: 'Roxo', color: '#c377e0' },
                      { name: 'Rosa', color: '#ff78cb' },
                      { name: 'Cinza', color: '#838c91' },
                      { name: 'Azul Escuro', color: '#344563' },
                      { name: 'Verde Escuro', color: '#1f845a' },
                      { name: 'Marrom', color: '#7c5127' },
                      { name: 'Preto', color: '#172b4d' },
                    ].map((color, index) => (
                      <button
                        key={index}
                        onClick={() => handleApplyBackgroundColor(color.color)}
                        className="h-12 rounded-lg transition-all hover:scale-110 shadow-md"
                        style={{ backgroundColor: color.color }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Image Tab */}
            {backgroundType === 'image' && (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    URL da Imagem
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="flex-1 px-4 py-3 rounded-xl focus:outline-none"
                      style={{
                        background: 'var(--surface-secondary)',
                        color: 'var(--text-primary)',
                        border: '2px solid var(--border-color)',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          if (input.value.trim()) {
                            handleApplyBackgroundImage(input.value.trim());
                          }
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input.value.trim()) {
                          handleApplyBackgroundImage(input.value.trim());
                        }
                      }}
                      className="px-6 py-3 rounded-xl font-medium transition-all hover:scale-105 text-white text-sm whitespace-nowrap"
                      style={{
                        background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                      }}
                    >
                      Aplicar
                    </button>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    Cole a URL de uma imagem hospedada online
                  </p>
                </div>

                {/* Image Presets */}
                <div>
                  <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Imagens Sugeridas
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: 'Montanhas', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
                      { name: 'Oceano', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80' },
                      { name: 'Floresta', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
                      { name: 'Cidade', url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920&q=80' },
                      { name: 'Espaço', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80' },
                      { name: 'Abstrato', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80' },
                    ].map((image, index) => (
                      <button
                        key={index}
                        onClick={() => handleApplyBackgroundImage(image.url)}
                        className="h-32 rounded-xl transition-all hover:scale-105 shadow-lg relative overflow-hidden group"
                        style={{
                          backgroundImage: `url(${image.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-end justify-center pb-3">
                          <span className="text-white text-sm font-semibold">
                            {image.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remove Background */}
                <div className="mt-6">
                  <button
                    onClick={() => updateBoardMutation.mutate({ backgroundColor: undefined, backgroundImageUrl: undefined })}
                    className="w-full px-4 py-3 rounded-xl font-medium transition-all hover:scale-105 text-sm"
                    style={{
                      background: 'var(--surface-secondary)',
                      color: 'var(--text-primary)',
                      border: '2px dashed var(--border-color)',
                    }}
                  >
                    Remover Fundo (Usar Padrão)
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Archived Items Modal */}
      {showArchivedModal && (
        <ArchivedItemsModal
          boardId={boardId!}
          onClose={() => setShowArchivedModal(false)}
        />
      )}

      {/* Members Modal */}
      {board && (
        <BoardMembersModal
          board={board}
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
        />
      )}
      </div>
    </MainLayout>
  );
}
