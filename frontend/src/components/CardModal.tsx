import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { cardService } from '../services/cardService';
import { commentService } from '../services/commentService';
import { checklistService } from '../services/checklistService';
import { labelService } from '../services/labelService';
import { attachmentService } from '../services/attachmentService';
import { activityService } from '../services/activityService';
import type { Card, Label, BoardMember, Comment, Checklist, Attachment, Activity } from '../types';
import { useAuthStore } from '../store/authStore';
import DatePicker from './common/DatePicker';
import { renderTextWithLinks } from '../utils/linkify';
import MentionInput from './common/MentionInput';
import { renderTextWithLinksAndMentions } from '../utils/renderMentions';

interface CardModalProps {
  card: Card;
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  availableLabels?: Label[];
  boardMembers?: BoardMember[];
}

export default function CardModal({
  card: initialCard,
  boardId,
  isOpen,
  onClose,
  availableLabels = [],
  boardMembers = [],
}: CardModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Get the updated card from the cache
  const boardData: any = queryClient.getQueryData(['board', boardId]);
  const card = boardData?.board?.lists
    ?.flatMap((l: any) => l.cards || [])
    .find((c: any) => c.id === initialCard.id) || initialCard;

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [dueDate, setDueDate] = useState(
    card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ''
  );

  // Update local state when card changes
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
  }, [card.title, card.description, card.dueDate]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState<{ [key: string]: string }>({});
  const [isAddingItem, setIsAddingItem] = useState<{ [key: string]: boolean }>({});
  const [isLabelsDropdownOpen, setIsLabelsDropdownOpen] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');
  const [isCompletionTimeOpen, setIsCompletionTimeOpen] = useState(false);
  const [completionTimeValue, setCompletionTimeValue] = useState('');
  const [completionTimeUnit, setCompletionTimeUnit] = useState('minutes');
  const [showAllComments, setShowAllComments] = useState(false);
  const [showAllAttachments, setShowAllAttachments] = useState(false);

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['comments', card.id],
    queryFn: () => commentService.getComments(card.id),
  });

  const comments = commentsData?.comments || [];

  // Fetch checklists
  const { data: checklistsData } = useQuery({
    queryKey: ['checklists', card.id],
    queryFn: () => checklistService.getChecklists(card.id),
  });

  const checklists = checklistsData?.checklists || [];

  // Fetch activities
  const { data: activitiesData } = useQuery({
    queryKey: ['activities', card.id],
    queryFn: () => activityService.getCardActivities(card.id),
  });

  const activities: Activity[] = activitiesData || [];

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description || '');
    setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
  }, [card]);

  const updateCardMutation = useMutation({
    mutationFn: (data: Partial<Card>) => cardService.updateCard(card.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: () => cardService.deleteCard(card.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      onClose();
    },
  });

  const archiveCardMutation = useMutation({
    mutationFn: () => cardService.archiveCard(card.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      onClose();
    },
  });

  const duplicateCardMutation = useMutation({
    mutationFn: () => cardService.duplicateCard(card.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      onClose();
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => cardService.addMember(card.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => cardService.removeMember(card.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => commentService.createComment(card.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', card.id] });
      setNewComment('');
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentService.updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', card.id] });
      setEditingCommentId(null);
      setEditingCommentContent('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => commentService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', card.id] });
    },
  });

  // Checklist mutations
  const createChecklistMutation = useMutation({
    mutationFn: (title: string) => checklistService.createChecklist(card.id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', card.id] });
      setNewChecklistTitle('');
      setIsAddingChecklist(false);
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: (checklistId: string) => checklistService.deleteChecklist(checklistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', card.id] });
    },
  });

  const createChecklistItemMutation = useMutation({
    mutationFn: ({ checklistId, title }: { checklistId: string; title: string }) =>
      checklistService.createChecklistItem(checklistId, title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checklists', card.id] });
      setNewItemTitle((prev) => ({ ...prev, [variables.checklistId]: '' }));
      setIsAddingItem((prev) => ({ ...prev, [variables.checklistId]: false }));
    },
  });

  const toggleChecklistItemMutation = useMutation({
    mutationFn: ({ itemId, isCompleted }: { itemId: string; isCompleted: boolean }) =>
      checklistService.updateChecklistItem(itemId, { isCompleted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', card.id] });
    },
  });

  const deleteChecklistItemMutation = useMutation({
    mutationFn: (itemId: string) => checklistService.deleteChecklistItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', card.id] });
    },
  });

  // Label mutations
  const createLabelMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      labelService.createLabel(boardId, name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setNewLabelName('');
      setNewLabelColor('#3B82F6');
      setIsCreatingLabel(false);
    },
  });

  const addLabelToCardMutation = useMutation({
    mutationFn: (labelId: string) => labelService.addLabelToCard(labelId, card.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const removeLabelFromCardMutation = useMutation({
    mutationFn: (labelId: string) => labelService.removeLabelFromCard(labelId, card.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (labelId: string) => labelService.deleteLabel(labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  // Attachment mutations
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const uploadAttachmentMutation = useMutation({
    mutationFn: (data: { name: string; url: string; fileSize: number; mimeType: string }) =>
      attachmentService.uploadAttachment(card.id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      await queryClient.refetchQueries({ queryKey: ['board', boardId], type: 'active' });
    },
  });

  const setCoverMutation = useMutation({
    mutationFn: (attachmentId: string | null) => cardService.setCover(card.id, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => attachmentService.deleteAttachment(attachmentId),
    onMutate: async (attachmentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['board', boardId] });

      // Snapshot previous value
      const previousBoard = queryClient.getQueryData(['board', boardId]);

      // Optimistically update to remove attachment
      queryClient.setQueryData(['board', boardId], (old: any) => {
        if (!old?.board?.lists) return old;

        const newLists = old.board.lists.map((list: any) => ({
          ...list,
          cards: list.cards?.map((c: any) => {
            if (c.id === card.id) {
              return {
                ...c,
                attachments: c.attachments?.filter((att: any) => att.id !== attachmentId) || [],
              };
            }
            return c;
          }),
        }));

        return { ...old, board: { ...old.board, lists: newLists } };
      });

      return { previousBoard };
    },
    onError: (err, attachmentId, context: any) => {
      // Rollback on error
      if (context?.previousBoard) {
        queryClient.setQueryData(['board', boardId], context.previousBoard);
      }
    },
    onSettled: async () => {
      // Always refetch after error or success
      await queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      await queryClient.refetchQueries({ queryKey: ['board', boardId], type: 'active' });
    },
  });

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      uploadAttachmentMutation.mutate({
        name: file.name,
        url: base64String,
        fileSize: file.size,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    processFile(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    if (confirm('Tem certeza que deseja deletar este anexo?')) {
      deleteAttachmentMutation.mutate(attachmentId);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleTitleBlur = () => {
    if (title !== card.title && title.trim()) {
      updateCardMutation.mutate({ title });
    }
  };

  const handleDescriptionSave = () => {
    if (description !== card.description) {
      updateCardMutation.mutate({ description });
    }
    setIsEditingDescription(false);
  };

  const toggleMember = (userId: string) => {
    const isMember = card.members?.some((m) => m.userId === userId);
    if (isMember) {
      removeMemberMutation.mutate(userId);
    } else {
      addMemberMutation.mutate(userId);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const handleSaveComment = () => {
    if (editingCommentId && editingCommentContent.trim()) {
      updateCommentMutation.mutate({
        commentId: editingCommentId,
        content: editingCommentContent,
      });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Tem certeza que deseja deletar este comentário?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  // Checklist handlers
  const handleAddChecklist = () => {
    if (newChecklistTitle.trim()) {
      createChecklistMutation.mutate(newChecklistTitle);
    }
  };

  const handleDeleteChecklist = (checklistId: string) => {
    if (confirm('Tem certeza que deseja deletar esta checklist?')) {
      deleteChecklistMutation.mutate(checklistId);
    }
  };

  const handleAddChecklistItem = (checklistId: string) => {
    const title = newItemTitle[checklistId];
    if (title?.trim()) {
      createChecklistItemMutation.mutate({ checklistId, title });
    }
  };

  const handleToggleChecklistItem = (itemId: string, isCompleted: boolean) => {
    toggleChecklistItemMutation.mutate({ itemId, isCompleted: !isCompleted });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    deleteChecklistItemMutation.mutate(itemId);
  };

  const calculateChecklistProgress = (checklist: Checklist) => {
    if (!checklist.items || checklist.items.length === 0) return 0;
    const completed = checklist.items.filter((item) => item.isCompleted).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  // Label handlers
  const handleToggleLabel = (labelId: string) => {
    const hasLabel = card.labels?.some((cl) => cl.label.id === labelId);
    if (hasLabel) {
      removeLabelFromCardMutation.mutate(labelId);
    } else {
      addLabelToCardMutation.mutate(labelId);
    }
  };

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      createLabelMutation.mutate({
        name: newLabelName,
        color: newLabelColor,
      });
    }
  };

  const handleDeleteLabel = (labelId: string, labelName: string) => {
    if (confirm(`Tem certeza que deseja deletar a label "${labelName}"? Ela será removida de todos os cards.`)) {
      deleteLabelMutation.mutate(labelId);
    }
  };

  const predefinedColors = [
    '#EF4444', // red
    '#F97316', // orange
    '#F59E0B', // amber
    '#EAB308', // yellow
    '#84CC16', // lime
    '#22C55E', // green
    '#10B981', // emerald
    '#14B8A6', // teal
    '#06B6D4', // cyan
    '#3B82F6', // blue
    '#6366F1', // indigo
    '#8B5CF6', // violet
    '#A855F7', // purple
    '#EC4899', // pink
    '#F43F5E', // rose
    '#64748B', // slate
  ];

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Fechar dropdown de tempo de conclusão ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isCompletionTimeOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest('.completion-time-dropdown') && !target.closest('.completion-time-button')) {
          setIsCompletionTimeOpen(false);
        }
      }
    };

    if (isCompletionTimeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCompletionTimeOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  className="text-xl font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 -ml-2 w-full"
                />
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {card.labels.map((cl) => (
                <span
                  key={cl.label.id}
                  className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: cl.label.color }}
                >
                  {cl.label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto flex-1">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Members */}
            {card.members && card.members.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Membros
                </h3>
                <div className="flex flex-wrap gap-2">
                  {card.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1"
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {member.user.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
                Descrição
              </h3>
              {isEditingDescription ? (
                <div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={6}
                    placeholder="Adicione uma descrição mais detalhada..."
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleDescriptionSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setDescription(card.description || '');
                        setIsEditingDescription(false);
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDescription(true)}
                  className="min-h-[80px] px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {description ? (
                    <p className="text-gray-700 dark:text-gray-300">
                      {renderTextWithLinks(description)}
                    </p>
                  ) : (
                    <p className="text-gray-400 dark:text-gray-500">
                      Adicione uma descrição mais detalhada...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Due Date */}
            {dueDate && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Data de Vencimento
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(dueDate).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
            )}

            {/* Checklists Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                Checklists
              </h3>

              {/* Checklists List */}
              <div className="space-y-4 mb-4">
                {checklists.map((checklist) => {
                  const progress = calculateChecklistProgress(checklist);
                  return (
                    <div
                      key={checklist.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                    >
                      {/* Checklist Header */}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {checklist.title}
                        </h4>
                        <button
                          onClick={() => handleDeleteChecklist(checklist.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Deletar checklist"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Progress Bar */}
                      {checklist.items && checklist.items.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {progress}%
                            </span>
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Checklist Items */}
                      <div className="space-y-1 mb-2">
                        {checklist.items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 group py-1"
                          >
                            <input
                              type="checkbox"
                              checked={item.isCompleted}
                              onChange={() =>
                                handleToggleChecklistItem(item.id, item.isCompleted)
                              }
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                            <span
                              className={`flex-1 text-sm ${
                                item.isCompleted
                                  ? 'line-through text-gray-500 dark:text-gray-400'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {item.title}
                            </span>
                            <button
                              onClick={() => handleDeleteChecklistItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-opacity"
                              title="Deletar item"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add Item Form */}
                      {isAddingItem[checklist.id] ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newItemTitle[checklist.id] || ''}
                            onChange={(e) =>
                              setNewItemTitle((prev) => ({
                                ...prev,
                                [checklist.id]: e.target.value,
                              }))
                            }
                            placeholder="Adicionar item..."
                            className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddChecklistItem(checklist.id);
                              } else if (e.key === 'Escape') {
                                setIsAddingItem((prev) => ({
                                  ...prev,
                                  [checklist.id]: false,
                                }));
                                setNewItemTitle((prev) => ({
                                  ...prev,
                                  [checklist.id]: '',
                                }));
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddChecklistItem(checklist.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                          >
                            Adicionar
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingItem((prev) => ({
                                ...prev,
                                [checklist.id]: false,
                              }));
                              setNewItemTitle((prev) => ({
                                ...prev,
                                [checklist.id]: '',
                              }));
                            }}
                            className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setIsAddingItem((prev) => ({
                              ...prev,
                              [checklist.id]: true,
                            }))
                          }
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          + Adicionar item
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Checklist Form */}
              {isAddingChecklist ? (
                <div className="mb-4">
                  <input
                    type="text"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    placeholder="Nome da checklist..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddChecklist();
                      } else if (e.key === 'Escape') {
                        setIsAddingChecklist(false);
                        setNewChecklistTitle('');
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddChecklist}
                      disabled={createChecklistMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {createChecklistMutation.isPending ? 'Criando...' : 'Adicionar'}
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingChecklist(false);
                        setNewChecklistTitle('');
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingChecklist(true)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Nova Checklist
                </button>
              )}
            </div>

            {/* Attachments Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
                Anexos ({card.attachments?.length || 0})
              </h3>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full px-6 py-8 mb-4 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
                  isDraggingOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800/50'
                } ${uploadAttachmentMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <svg
                    className={`w-10 h-10 transition-colors ${
                      isDraggingOver ? 'text-blue-500' : 'text-gray-400'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div>
                    <p className={`text-sm font-medium ${isDraggingOver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {uploadAttachmentMutation.isPending
                        ? 'Enviando...'
                        : isDraggingOver
                        ? 'Solte o arquivo aqui'
                        : 'Arraste um arquivo ou clique para selecionar'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Imagens, PDFs, documentos (máx. 50MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Attachments List */}
              <div className="space-y-2">
                {card.attachments && card.attachments.length > 0 ? (
                  <>
                  {(showAllAttachments ? card.attachments : card.attachments.slice(0, 2)).map((attachment: Attachment) => {
                    const isImage = attachment.mimeType.startsWith('image/');
                    return (
                      <div
                        key={attachment.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Thumbnail or Icon */}
                          <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            {isImage ? (
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {attachment.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatFileSize(attachment.fileSize)} • Enviado por {attachment.uploader.name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(attachment.uploadedAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isImage && (
                              <button
                                onClick={() => setCoverMutation.mutate(
                                  card.coverAttachmentId === attachment.id ? null : attachment.id
                                )}
                                className={`p-2 rounded-lg transition-colors ${
                                  card.coverAttachmentId === attachment.id
                                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                    : 'hover:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                                }`}
                                title={card.coverAttachmentId === attachment.id ? 'Remover capa' : 'Definir como capa'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </button>
                            )}
                            <a
                              href={attachment.url}
                              download={attachment.name}
                              className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                              title="Baixar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(attachment.id)}
                              className="p-2 rounded-lg hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                              title="Deletar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Botão Ver Mais Anexos */}
                  {card.attachments && card.attachments.length > 2 && (
                    <div className="pt-2">
                      <button
                        onClick={() => setShowAllAttachments(!showAllAttachments)}
                        className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {showAllAttachments ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Mostrar menos
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Ver mais {card.attachments.length - 2} anexo{card.attachments.length - 2 > 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Nenhum anexo ainda.
                  </p>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Comentários ({comments.length})
              </h3>

              {/* Add Comment */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <MentionInput
                      value={newComment}
                      onChange={setNewComment}
                      placeholder="Escreva um comentário... (use @ para mencionar)"
                      rows={3}
                      users={boardMembers.map(m => ({
                        id: m.userId,
                        name: m.user.name,
                        avatarUrl: m.user.avatarUrl
                      }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          handleAddComment();
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {newComment.trim() && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleAddComment}
                          disabled={createCommentMutation.isPending}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                          {createCommentMutation.isPending ? 'Enviando...' : 'Comentar'}
                        </button>
                        <button
                          onClick={() => setNewComment('')}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Nenhum comentário ainda. Seja o primeiro a comentar!
                  </p>
                ) : (
                  <>
                    {(showAllComments ? comments : comments.slice(0, 3)).map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {comment.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {comment.user.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {new Date(comment.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {comment.userId === user?.id && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditComment(comment)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Deletar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === comment.id ? (
                          <div>
                            <MentionInput
                              value={editingCommentContent}
                              onChange={setEditingCommentContent}
                              rows={3}
                              users={boardMembers.map(m => ({
                                id: m.userId,
                                name: m.user.name,
                                avatarUrl: m.user.avatarUrl
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={handleSaveComment}
                                disabled={updateCommentMutation.isPending}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentContent('');
                                }}
                                className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {renderTextWithLinksAndMentions(comment.content)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Botão Ver Mais */}
                  {comments.length > 3 && (
                    <div className="pt-2">
                      <button
                        onClick={() => setShowAllComments(!showAllComments)}
                        className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        {showAllComments ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Mostrar menos
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Ver mais {comments.length - 3} comentário{comments.length - 3 > 1 ? 's' : ''}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  </>
                )}
              </div>
            </div>

            {/* Activities Section */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Atividades
              </h3>

              <div className="space-y-3">
                {activities.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Nenhuma atividade registrada
                  </p>
                ) : (
                  activities.map((activity) => {
                    const getActivityIcon = () => {
                      switch (activity.actionType) {
                        case 'CREATED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          );
                        case 'UPDATED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          );
                        case 'MOVED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          );
                        case 'ARCHIVED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          );
                        case 'COMMENTED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          );
                        case 'ASSIGNED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          );
                        case 'LABELED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          );
                        case 'ATTACHED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          );
                        case 'COVER_CHANGED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          );
                        case 'DUE_DATE_CHANGED':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          );
                        case 'COMPLETION_TIME_SET':
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          );
                        default:
                          return (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          );
                      }
                    };

                    const getActivityText = () => {
                      let details;
                      try {
                        details = activity.details ? JSON.parse(activity.details) : {};
                      } catch {
                        details = {};
                      }

                      switch (activity.actionType) {
                        case 'CREATED':
                          return 'criou este card';
                        case 'UPDATED':
                          return 'atualizou este card';
                        case 'MOVED':
                          return `moveu de "${details.fromList}" para "${details.toList}"`;
                        case 'ARCHIVED':
                          return 'arquivou este card';
                        case 'COMMENTED':
                          return 'adicionou um comentário';
                        case 'ASSIGNED':
                          return `atribuiu ${details.assignedUserName}`;
                        case 'LABELED':
                          return details.action === 'added' ? `adicionou a etiqueta "${details.labelName}"` : `removeu a etiqueta "${details.labelName}"`;
                        case 'ATTACHED':
                          return `anexou "${details.fileName}"`;
                        case 'COVER_CHANGED':
                          return details.action === 'set' ? 'definiu uma capa' : 'removeu a capa';
                        case 'DUE_DATE_CHANGED':
                          return details.action === 'set' ? 'definiu a data de vencimento' : 'removeu a data de vencimento';
                        case 'COMPLETION_TIME_SET':
                          return details.completionTime ? 'definiu o tempo de conclusão' : 'removeu o tempo de conclusão';
                        default:
                          return 'realizou uma ação';
                      }
                    };

                    const timeAgo = (date: string) => {
                      const now = new Date();
                      const activityDate = new Date(date);
                      const diffMs = now.getTime() - activityDate.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);

                      if (diffMins < 1) return 'agora mesmo';
                      if (diffMins < 60) return `há ${diffMins} min`;
                      if (diffHours < 24) return `há ${diffHours}h`;
                      if (diffDays < 7) return `há ${diffDays}d`;
                      return activityDate.toLocaleDateString('pt-BR');
                    };

                    return (
                      <div
                        key={activity.id}
                        className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        style={{
                          borderLeft: '2px solid var(--border-color)',
                        }}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {getActivityIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            <span className="font-semibold">{activity.user.name}</span>
                            {' '}
                            <span className="text-gray-600 dark:text-gray-400">{getActivityText()}</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {timeAgo(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Adicionar ao Card
            </h3>

            {/* Add Labels */}
            <div className="relative">
              <button
                onClick={() => setIsLabelsDropdownOpen(!isLabelsDropdownOpen)}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                Labels
              </button>

              {/* Labels Dropdown */}
              {isLabelsDropdownOpen && (
                <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-10 max-h-96 overflow-y-auto">
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Labels
                      </h4>
                      <button
                        onClick={() => setIsLabelsDropdownOpen(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Existing Labels */}
                    <div className="space-y-1.5 mb-3">
                      {availableLabels.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                          Nenhuma label criada
                        </p>
                      ) : (
                        availableLabels.map((label) => {
                          const isSelected = card.labels?.some((cl) => cl.label.id === label.id);
                          return (
                            <div key={label.id} className="flex gap-1 group">
                              <button
                                onClick={() => handleToggleLabel(label.id)}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                                    : 'hover:opacity-80'
                                }`}
                                style={{ backgroundColor: label.color, color: 'white' }}
                              >
                                <span>{label.name}</span>
                                {isSelected && (
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLabel(label.id, label.name);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 transition-all"
                                title="Deletar label"
                              >
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Create New Label */}
                    {isCreatingLabel ? (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <input
                          type="text"
                          value={newLabelName}
                          onChange={(e) => setNewLabelName(e.target.value)}
                          placeholder="Nome da label..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateLabel();
                            } else if (e.key === 'Escape') {
                              setIsCreatingLabel(false);
                              setNewLabelName('');
                            }
                          }}
                        />

                        {/* Color Picker */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cor
                          </label>
                          <div className="grid grid-cols-8 gap-2">
                            {predefinedColors.map((color) => (
                              <button
                                key={color}
                                onClick={() => setNewLabelColor(color)}
                                className={`w-8 h-8 rounded-lg transition-all ${
                                  newLabelColor === color
                                    ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800 scale-110'
                                    : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateLabel}
                            disabled={createLabelMutation.isPending}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            {createLabelMutation.isPending ? 'Criando...' : 'Criar'}
                          </button>
                          <button
                            onClick={() => {
                              setIsCreatingLabel(false);
                              setNewLabelName('');
                            }}
                            className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsCreatingLabel(true)}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center justify-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-3"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Criar Nova Label
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Add Members */}
            {boardMembers.length > 0 && (
              <div>
                <button className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Membros
                </button>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {boardMembers.map((member) => {
                    const isMember = card.members?.some((m) => m.userId === member.userId);
                    return (
                      <button
                        key={member.id}
                        onClick={() => toggleMember(member.userId)}
                        className={`w-full px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                          isMember
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-left">{member.user.name}</span>
                        {isMember && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Due Date Picker */}
            <div>
              <DatePicker
                value={dueDate}
                onChange={(date) => {
                  setDueDate(date ? new Date(date).toISOString().split('T')[0] : '');
                  updateCardMutation.mutate({ dueDate: date || undefined });
                }}
                onClear={() => {
                  setDueDate('');
                  updateCardMutation.mutate({ dueDate: undefined });
                }}
                placeholder="Data de Vencimento"
              />
            </div>

            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pt-4">
              Ações
            </h3>

            {/* Duplicate */}
            <button
              onClick={() => duplicateCardMutation.mutate()}
              disabled={duplicateCardMutation.isPending}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Duplicar
            </button>

            {/* Completion Time */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCompletionTimeOpen(!isCompletionTimeOpen);
                if (card.completionTime) {
                  setCompletionTimeValue(String(card.completionTime));
                  setCompletionTimeUnit('minutes');
                }
              }}
              className="completion-time-button w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tempo de Conclusão
            </button>

            {/* Completion Time Dropdown - Fixed overlay */}
            {isCompletionTimeOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-black/30 animate-fade-in"
                  style={{ zIndex: 99998 }}
                  onClick={() => setIsCompletionTimeOpen(false)}
                />

                {/* Dropdown Menu */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="completion-time-dropdown fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 animate-slide-up"
                  style={{
                    minWidth: '320px',
                    zIndex: 99999,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <h3 className="font-semibold text-base mb-4 text-gray-900 dark:text-white">
                    Tempo de Conclusão
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={completionTimeValue}
                      onChange={(e) => setCompletionTimeValue(e.target.value)}
                      placeholder="0"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={completionTimeUnit}
                      onChange={(e) => setCompletionTimeUnit(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="seconds">Segundos</option>
                      <option value="minutes">Minutos</option>
                      <option value="hours">Horas</option>
                      <option value="days">Dias</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateCardMutation.mutate({ completionTime: null });
                        setIsCompletionTimeOpen(false);
                        setCompletionTimeValue('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm font-medium"
                    >
                      Remover
                    </button>
                    <button
                      onClick={() => {
                        const value = parseFloat(completionTimeValue);
                        if (!isNaN(value) && value > 0) {
                          let minutes = value;
                          if (completionTimeUnit === 'seconds') minutes = value / 60;
                          else if (completionTimeUnit === 'hours') minutes = value * 60;
                          else if (completionTimeUnit === 'days') minutes = value * 1440;

                          updateCardMutation.mutate({ completionTime: Math.round(minutes) });
                          setIsCompletionTimeOpen(false);
                        }
                      }}
                      disabled={!completionTimeValue || parseFloat(completionTimeValue) <= 0}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Archive */}
            <button
              onClick={() => archiveCardMutation.mutate()}
              disabled={archiveCardMutation.isPending}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              Arquivar
            </button>

            {/* Delete */}
            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja deletar este card?')) {
                  deleteCardMutation.mutate();
                }
              }}
              disabled={deleteCardMutation.isPending}
              className="w-full px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Deletar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
