import { useState, useMemo } from 'react';
import type { Board, Card } from '../types';

interface TableViewProps {
  board: Board;
  onCardClick: (card: Card) => void;
}

interface CardWithList extends Card {
  listTitle: string;
}

type SortField = 'title' | 'list' | 'labels' | 'members' | 'dueDate' | 'status';
type SortDirection = 'asc' | 'desc';

function getDueDateStatus(card: CardWithList): 'completed' | 'overdue' | 'today' | 'none' | 'upcoming' {
  if (card.isCompleted) return 'completed';
  if (!card.dueDate) return 'none';
  const now = new Date();
  const due = new Date(card.dueDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  if (due < today) return 'overdue';
  if (due >= today && due < tomorrow) return 'today';
  return 'upcoming';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const DUE_DATE_COLORS: Record<string, { bg: string; text: string }> = {
  overdue: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
  today: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' },
  completed: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80' },
  upcoming: { bg: 'transparent', text: 'var(--text-secondary)' },
  none: { bg: 'transparent', text: 'var(--text-dimmed)' },
};

// Simple hash to get a consistent color for a member
function memberColor(name: string): string {
  const colors = [
    '#60a5fa', '#f472b6', '#a78bfa', '#34d399',
    '#fbbf24', '#fb923c', '#e879f9', '#22d3ee',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function TableView({ board, onCardClick }: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten all cards from all non-archived lists
  const allCards = useMemo<CardWithList[]>(() => {
    const lists = board.lists?.filter((l) => !l.isArchived) || [];
    return lists.flatMap((l) =>
      (l.cards || [])
        .filter((c) => !c.isArchived)
        .map((c) => ({
          ...c,
          listTitle: l.title,
        }))
    );
  }, [board]);

  // Filter and sort
  const sortedCards = useMemo(() => {
    let filtered = allCards;

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => c.title.toLowerCase().includes(q));
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title, 'pt-BR');
          break;
        case 'list':
          cmp = a.listTitle.localeCompare(b.listTitle, 'pt-BR');
          break;
        case 'labels': {
          const aLabel = a.labels?.[0]?.label?.name || '';
          const bLabel = b.labels?.[0]?.label?.name || '';
          cmp = aLabel.localeCompare(bLabel, 'pt-BR');
          break;
        }
        case 'members': {
          const aMember = a.members?.[0]?.user?.name || '';
          const bMember = b.members?.[0]?.user?.name || '';
          cmp = aMember.localeCompare(bMember, 'pt-BR');
          break;
        }
        case 'dueDate': {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          cmp = aDate - bDate;
          break;
        }
        case 'status': {
          const aVal = a.isCompleted ? 1 : 0;
          const bVal = b.isCompleted ? 1 : 0;
          cmp = aVal - bVal;
          break;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [allCards, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return (
      <span style={{ marginLeft: '4px', fontSize: '10px' }}>
        {sortDirection === 'asc' ? '\u25B2' : '\u25BC'}
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '0 16px 12px',
        gap: '12px',
      }}
    >
      {/* Table Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderRadius: '14px',
          background: 'var(--surface-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="var(--text-dimmed)"
              viewBox="0 0 24 24"
              style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Filtrar cards por titulo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 10px 6px 30px',
                borderRadius: '8px',
                background: 'var(--surface-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 500,
                outline: 'none',
                width: '260px',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-accent)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            />
          </div>
        </div>

        {/* Card count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {sortedCards.length} {sortedCards.length === 1 ? 'card' : 'cards'}
            {searchQuery.trim() && allCards.length !== sortedCards.length && (
              <span style={{ color: 'var(--text-dimmed)' }}> de {allCards.length}</span>
            )}
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          flex: 1,
          borderRadius: '14px',
          background: 'var(--surface-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-default)',
          overflow: 'auto',
        }}
      >
        {allCards.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              gap: '12px',
            }}
          >
            <svg
              width="40"
              height="40"
              fill="none"
              stroke="var(--text-dimmed)"
              viewBox="0 0 24 24"
              style={{ opacity: 0.5 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 10h18M3 14h18M3 6h18M3 18h18"
              />
            </svg>
            <span style={{ fontSize: '14px', color: 'var(--text-dimmed)', fontWeight: 500 }}>
              Nenhum card encontrado
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Adicione cards nas listas para visualizar aqui
            </span>
          </div>
        ) : sortedCards.length === 0 && searchQuery.trim() ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              gap: '12px',
            }}
          >
            <svg
              width="40"
              height="40"
              fill="none"
              stroke="var(--text-dimmed)"
              viewBox="0 0 24 24"
              style={{ opacity: 0.5 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span style={{ fontSize: '14px', color: 'var(--text-dimmed)', fontWeight: 500 }}>
              Nenhum resultado para &ldquo;{searchQuery}&rdquo;
            </span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {([
                  { field: 'title' as SortField, label: 'Titulo', width: undefined },
                  { field: 'list' as SortField, label: 'Lista', width: '140px' },
                  { field: 'labels' as SortField, label: 'Labels', width: '180px' },
                  { field: 'members' as SortField, label: 'Membros', width: '140px' },
                  { field: 'dueDate' as SortField, label: 'Data de entrega', width: '140px' },
                  { field: 'status' as SortField, label: 'Status', width: '80px' },
                ] as const).map((col) => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: 'var(--surface-input)',
                      borderBottom: '1px solid var(--border-accent)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      width: col.width,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    {col.label}
                    {sortIcon(col.field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCards.map((card) => {
                const status = getDueDateStatus(card);
                const dueDateColors = DUE_DATE_COLORS[status];

                return (
                  <tr
                    key={card.id}
                    onClick={() => onCardClick(card)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-accent)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {/* Title */}
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {card.title}
                    </td>

                    {/* List */}
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--surface-subtle)',
                          border: '1px solid var(--border-default)',
                          fontSize: '11px',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {card.listTitle}
                      </span>
                    </td>

                    {/* Labels */}
                    <td style={{ padding: '10px 14px' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                        }}
                      >
                        {(card.labels || []).map((cl) => (
                          <span
                            key={cl.labelId}
                            style={{
                              display: 'inline-block',
                              padding: '1px 8px',
                              borderRadius: '10px',
                              background: cl.label.color + '33',
                              color: cl.label.color,
                              fontSize: '10px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              border: `1px solid ${cl.label.color}44`,
                            }}
                          >
                            {cl.label.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Members */}
                    <td style={{ padding: '10px 14px' }}>
                      <div
                        style={{
                          display: 'flex',
                          gap: '4px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {(card.members || []).map((cm) => (
                          <div
                            key={cm.userId}
                            title={cm.user.name}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: memberColor(cm.user.name),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {cm.user.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: '10px 14px' }}>
                      {card.dueDate ? (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: dueDateColors.bg,
                            color: dueDateColors.text,
                            fontSize: '11px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatDate(card.dueDate)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-dimmed)' }}>
                          &mdash;
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td
                      style={{
                        padding: '10px 14px',
                        textAlign: 'center',
                      }}
                    >
                      {card.isCompleted ? (
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '2px solid #4ade80',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            fill="none"
                            stroke="#4ade80"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            border: '2px solid var(--border-accent)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.5,
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
