import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { workspaceService } from '../services/workspaceService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workspaces: { id: string; name: string; boards: { id: string; name: string }[] }[];
}

const ACTION_TYPES = [
  { value: '', label: 'Todos os tipos' },
  { value: 'CREATED', label: 'Criados' },
  { value: 'UPDATED', label: 'Atualizados' },
  { value: 'MOVED', label: 'Movidos' },
  { value: 'ARCHIVED', label: 'Arquivados' },
  { value: 'DELETED', label: 'Excluidos' },
  { value: 'COMMENTED', label: 'Comentarios' },
  { value: 'ASSIGNED', label: 'Atribuicoes' },
  { value: 'MEMBER_REMOVED', label: 'Membros removidos' },
  { value: 'LABELED', label: 'Etiquetas' },
  { value: 'ATTACHED', label: 'Anexos' },
  { value: 'COVER_CHANGED', label: 'Capas' },
  { value: 'DUE_DATE_CHANGED', label: 'Prazos' },
  { value: 'COMPLETION_TIME_SET', label: 'Tempo de conclusao' },
  { value: 'LIST_CREATED', label: 'Listas criadas' },
  { value: 'LIST_DELETED', label: 'Listas excluidas' },
  { value: 'LIST_RENAMED', label: 'Listas renomeadas' },
  { value: 'BOARD_MEMBER_ADDED', label: 'Membros adicionados ao board' },
  { value: 'BOARD_MEMBER_REMOVED', label: 'Membros removidos do board' },
];

function parseDetails(details: string | object | null): any {
  if (!details) return {};
  if (typeof details === 'object') return details;
  try {
    return JSON.parse(details);
  } catch {
    return {};
  }
}

function formatActivityDescription(activity: any): string {
  const details = parseDetails(activity.details);
  const cardTitle = activity.card?.title || details.cardTitle || 'card';

  switch (activity.actionType) {
    case 'CREATED':
      return `criou o card "${details.cardTitle || cardTitle}"`;
    case 'UPDATED':
      return `atualizou o card "${cardTitle}"`;
    case 'MOVED':
      return `moveu "${cardTitle}" de "${details.fromList || '?'}" para "${details.toList || '?'}"`;
    case 'ARCHIVED':
      return `arquivou o card "${details.cardTitle || cardTitle}"`;
    case 'DELETED':
      return `excluiu o card "${details.cardTitle || cardTitle}"`;
    case 'COMMENTED':
      return `comentou em "${cardTitle}"`;
    case 'ASSIGNED':
      return `atribuiu ${details.assignedUserName || 'alguem'} ao card "${cardTitle}"`;
    case 'MEMBER_REMOVED':
      return `removeu ${details.removedUserName || 'alguem'} do card "${cardTitle}"`;
    case 'LABELED':
      return details.action === 'added'
        ? `adicionou etiqueta "${details.labelName || ''}" em "${cardTitle}"`
        : `removeu etiqueta "${details.labelName || ''}" de "${cardTitle}"`;
    case 'ATTACHED':
      return `anexou "${details.fileName || 'arquivo'}" em "${cardTitle}"`;
    case 'COVER_CHANGED':
      return details.action === 'set'
        ? `alterou a capa de "${cardTitle}"`
        : `removeu a capa de "${cardTitle}"`;
    case 'DUE_DATE_CHANGED':
      return details.action === 'set'
        ? `definiu prazo para "${cardTitle}"`
        : `removeu prazo de "${cardTitle}"`;
    case 'COMPLETION_TIME_SET':
      return `definiu tempo de conclusao para "${cardTitle}"`;
    case 'LIST_CREATED':
      return `criou a lista "${details.listTitle || '?'}"`;
    case 'LIST_DELETED':
      return `excluiu a lista "${details.listTitle || '?'}"`;
    case 'LIST_RENAMED':
      return `renomeou a lista "${details.oldTitle || '?'}" para "${details.newTitle || '?'}"`;
    case 'BOARD_MEMBER_ADDED':
      return `adicionou ${details.memberName || 'alguem'} ao board`;
    case 'BOARD_MEMBER_REMOVED':
      return `removeu ${details.memberName || 'alguem'} do board`;
    default:
      return `realizou uma acao em "${cardTitle}"`;
  }
}

function getActivityIcon(actionType: string): { color: string; svg: JSX.Element } {
  switch (actionType) {
    case 'CREATED':
      return {
        color: '#22c55e',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
          </svg>
        ),
      };
    case 'MOVED':
      return {
        color: '#3b82f6',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        ),
      };
    case 'DELETED':
      return {
        color: '#ef4444',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        ),
      };
    case 'ARCHIVED':
      return {
        color: '#f59e0b',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        ),
      };
    case 'COMMENTED':
      return {
        color: '#eab308',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
      };
    case 'ASSIGNED':
    case 'MEMBER_REMOVED':
      return {
        color: '#a855f7',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      };
    case 'LIST_CREATED':
    case 'LIST_DELETED':
    case 'LIST_RENAMED':
      return {
        color: '#14b8a6',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        ),
      };
    case 'BOARD_MEMBER_ADDED':
    case 'BOARD_MEMBER_REMOVED':
      return {
        color: '#f97316',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      };
    case 'LABELED':
      return {
        color: '#8b5cf6',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
      };
    case 'ATTACHED':
      return {
        color: '#06b6d4',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        ),
      };
    case 'COVER_CHANGED':
      return {
        color: '#ec4899',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      };
    case 'DUE_DATE_CHANGED':
    case 'COMPLETION_TIME_SET':
      return {
        color: '#10b981',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case 'UPDATED':
      return {
        color: '#6366f1',
        svg: (
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        ),
      };
    default:
      return {
        color: '#6b7280',
        svg: (
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4" />
          </svg>
        ),
      };
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min atrás`;
  if (diffH < 24) return `${diffH} h atrás`;
  if (diffDays < 7) return `${diffDays} dias atrás`;

  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const ITEMS_PER_PAGE = 20;

export default function WorkspaceActivityFeed({ isOpen, onClose, workspaces }: Props) {
  const [offset, setOffset] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [boardFilter, setBoardFilter] = useState('');
  const [workspaceFilter, setWorkspaceFilter] = useState('');
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const prevIsOpen = useRef(false);

  // Always default to first workspace
  const activeWorkspaceId = workspaceFilter || (workspaces.length > 0 ? workspaces[0].id : '');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['workspace-activities', activeWorkspaceId, offset, typeFilter, boardFilter],
    queryFn: () =>
      workspaceService.getWorkspaceActivities(activeWorkspaceId, {
        limit: ITEMS_PER_PAGE,
        offset,
        type: typeFilter || undefined,
        boardId: boardFilter || undefined,
      }),
    enabled: isOpen && !!activeWorkspaceId,
    staleTime: 10000,
  });

  // Reset only when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setOffset(0);
      setTypeFilter('');
      setBoardFilter('');
      setWorkspaceFilter('');
      setAllActivities([]);
      setHasInitialLoad(false);
    }
    prevIsOpen.current = isOpen;
  }, [isOpen]);

  // Handle data changes
  useEffect(() => {
    if (!data) return;
    if (offset === 0) {
      setAllActivities(data.activities);
    } else {
      setAllActivities((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newItems = data.activities.filter((a: any) => !existingIds.has(a.id));
        return [...prev, ...newItems];
      });
    }
    setHasInitialLoad(true);
  }, [data, offset]);

  // Reset when filters change
  const handleFilterChange = useCallback((setter: (v: string) => void, value: string) => {
    setter(value);
    setOffset(0);
    setAllActivities([]);
    setHasInitialLoad(false);
  }, []);

  const total = data?.total ?? 0;
  const hasMore = allActivities.length < total;

  // Get boards for selected workspace
  const activeBoards = workspaceFilter
    ? workspaces.find(w => w.id === workspaceFilter)?.boards || []
    : workspaces.flatMap(w => w.boards);

  const selectStyle: React.CSSProperties = {
    padding: '7px 12px',
    borderRadius: 8,
    background: 'var(--surface-input)',
    color: 'var(--text-primary)',
    border: '1px solid var(--accent-bg-medium)',
    outline: 'none',
    fontSize: 12,
    fontFamily: 'inherit',
    cursor: 'pointer',
    minWidth: 140,
    appearance: 'none' as const,
    WebkitAppearance: 'none' as any,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238b8fa3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: 30,
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--overlay-bg)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          borderRadius: 16,
          maxWidth: 600,
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--modal-shadow)',
          background: 'var(--surface-dropdown)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-accent)',
          margin: '0 16px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-accent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--gradient-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Registro de Atividades
              </h3>
              {total > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{total} atividades</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-sidebar-input)',
              color: 'var(--text-faint)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 24px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-accent)' }}>
          {workspaces.length > 1 && (
            <select
              value={workspaceFilter}
              onChange={(e) => {
                handleFilterChange(setWorkspaceFilter, e.target.value);
                setBoardFilter('');
              }}
              style={selectStyle}
            >
              <option value="" style={{ background: 'var(--surface-card-solid)', color: 'var(--text-primary)' }}>
                Selecione um workspace
              </option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id} style={{ background: 'var(--surface-card-solid)', color: 'var(--text-primary)' }}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={typeFilter}
            onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
            style={selectStyle}
          >
            {ACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value} style={{ background: 'var(--surface-card-solid)', color: 'var(--text-primary)' }}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={boardFilter}
            onChange={(e) => handleFilterChange(setBoardFilter, e.target.value)}
            style={selectStyle}
          >
            <option value="" style={{ background: 'var(--surface-card-solid)', color: 'var(--text-primary)' }}>
              Todos os boards
            </option>
            {activeBoards.map((b) => (
              <option key={b.id} value={b.id} style={{ background: 'var(--surface-card-solid)', color: 'var(--text-primary)' }}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {/* No workspace selected */}
          {!activeWorkspaceId && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="22" height="22" fill="none" stroke="var(--text-dimmed)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-dimmed)', margin: 0 }}>Selecione um workspace para ver as atividades</p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && !hasInitialLoad && activeWorkspaceId && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
              <div style={{
                width: 24, height: 24,
                border: '2px solid var(--accent-bg-strong)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'dp-spin 0.8s linear infinite',
              }} />
              <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-faint)' }}>Carregando atividades...</span>
            </div>
          )}

          {/* Empty state */}
          {hasInitialLoad && allActivities.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <svg width="22" height="22" fill="none" stroke="var(--text-dimmed)" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-dimmed)', margin: 0 }}>Nenhuma atividade encontrada</p>
            </div>
          )}

          {/* Activity Timeline */}
          {allActivities.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Vertical timeline line */}
              <div style={{
                position: 'absolute', left: 15, top: 4, bottom: 4,
                width: 2, background: 'var(--accent-bg)', borderRadius: 1,
              }} />

              {allActivities.map((activity, idx) => {
                const icon = getActivityIcon(activity.actionType);
                const userName = activity.user?.name || 'Usuario';
                const boardName = activity.board?.name;

                return (
                  <div
                    key={activity.id || idx}
                    style={{ display: 'flex', gap: 12, padding: '10px 0', position: 'relative' }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `${icon.color}18`,
                      border: `2px solid ${icon.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, color: icon.color, zIndex: 1,
                    }}>
                      {icon.svg}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, color: 'var(--text-primary)', margin: 0, lineHeight: 1.45 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{userName}</span>{' '}
                        <span style={{ color: 'var(--text-faint)' }}>{formatActivityDescription(activity)}</span>
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-dimmed)' }}>{formatRelativeTime(activity.createdAt)}</span>
                        {boardName && (
                          <span style={{
                            fontSize: 10, fontWeight: 500, color: 'var(--accent)',
                            background: 'var(--border-accent)', padding: '1px 7px',
                            borderRadius: 6, border: '1px solid var(--accent-bg-medium)',
                          }}>
                            {boardName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {hasMore && hasInitialLoad && (
            <div style={{ textAlign: 'center', marginTop: 12, paddingBottom: 8 }}>
              <button
                onClick={() => setOffset((prev) => prev + ITEMS_PER_PAGE)}
                disabled={isFetching}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: 'var(--border-accent)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border-accent-medium)',
                  cursor: isFetching ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  opacity: isFetching ? 0.6 : 1,
                }}
              >
                {isFetching ? 'Carregando...' : 'Ver mais'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
