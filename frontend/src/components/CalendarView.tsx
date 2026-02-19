import { useState, useMemo } from 'react';
import type { Board, Card } from '../types';

interface CalendarViewProps {
  board: Board;
  onCardClick: (card: Card) => void;
}

interface CardWithList extends Card {
  listTitle: string;
}

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCardStatus(card: CardWithList): 'completed' | 'overdue' | 'today' | 'upcoming' {
  if (card.isCompleted) return 'completed';
  const now = new Date();
  const due = new Date(card.dueDate!);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  if (due < today) return 'overdue';
  if (due >= today && due < tomorrow) return 'today';
  return 'upcoming';
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  overdue: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: '#f87171',
    border: 'rgba(239, 68, 68, 0.3)',
  },
  today: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: '#fbbf24',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  upcoming: {
    bg: 'rgba(96, 165, 250, 0.15)',
    text: '#93c5fd',
    border: 'rgba(96, 165, 250, 0.3)',
  },
  completed: {
    bg: 'rgba(34, 197, 94, 0.15)',
    text: '#4ade80',
    border: 'rgba(34, 197, 94, 0.3)',
  },
};

export default function CalendarView({ board, onCardClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get all cards with due dates from all non-archived lists
  const cardsWithDue = useMemo(() => {
    const lists = board.lists?.filter((l) => !l.isArchived) || [];
    return lists.flatMap((l) =>
      (l.cards || [])
        .filter((c) => !c.isArchived && c.dueDate)
        .map((c) => ({
          ...c,
          listTitle: l.title,
        }))
    );
  }, [board]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Start from Monday: getDay() 0=Sun -> offset 6, 1=Mon -> offset 0, etc.
  const startOffset = (firstDay.getDay() + 6) % 7;

  // Previous month days to show
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Total cells needed (6 rows x 7 columns = 42)
  const totalCells = 42;

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean }> = [];
    const today = new Date();

    // Previous month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today),
      });
    }

    // Next month leading days
    const remaining = totalCells - days.length;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today),
      });
    }

    return days;
  }, [year, month, daysInMonth, startOffset, prevMonthLastDay]);

  // Group cards by date string for quick lookup
  const cardsByDate = useMemo(() => {
    const map = new Map<string, CardWithList[]>();
    for (const card of cardsWithDue) {
      const due = new Date(card.dueDate!);
      const key = `${due.getFullYear()}-${due.getMonth()}-${due.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(card);
    }
    return map;
  }, [cardsWithDue]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Count cards with due dates
  const totalDueCards = cardsWithDue.length;
  const overdueCount = cardsWithDue.filter((c) => getCardStatus(c) === 'overdue').length;
  const todayCount = cardsWithDue.filter((c) => getCardStatus(c) === 'today').length;

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
      {/* Calendar Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={goToPrevMonth}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-subtle)';
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h2
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.3px',
              minWidth: '180px',
              textAlign: 'center',
            }}
          >
            {MONTH_NAMES[month]} {year}
          </h2>

          <button
            onClick={goToNextMonth}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-subtle)';
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={goToToday}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              background: 'var(--accent-bg)',
              border: '1px solid var(--border-accent)',
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-bg-medium)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-bg)';
            }}
          >
            Hoje
          </button>
        </div>

        {/* Stats summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#60a5fa',
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {totalDueCards} com prazo
            </span>
          </div>
          {overdueCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#f87171',
                }}
              />
              <span style={{ fontSize: '11px', color: '#f87171' }}>
                {overdueCount} atrasado{overdueCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {todayCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#fbbf24',
                }}
              />
              <span style={{ fontSize: '11px', color: '#fbbf24' }}>
                {todayCount} para hoje
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          flex: 1,
          borderRadius: '14px',
          background: 'var(--surface-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Day Names Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              style={{
                padding: '10px 8px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Rows */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: 'repeat(6, 1fr)',
          }}
        >
          {calendarDays.map((dayInfo, idx) => {
            const dateKey = `${dayInfo.date.getFullYear()}-${dayInfo.date.getMonth()}-${dayInfo.date.getDate()}`;
            const dayCards = cardsByDate.get(dateKey) || [];
            const maxVisible = 3;
            const visibleCards = dayCards.slice(0, maxVisible);
            const hiddenCount = dayCards.length - maxVisible;

            return (
              <div
                key={idx}
                style={{
                  borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border-subtle)' : undefined,
                  borderBottom: idx < 35 ? '1px solid var(--border-subtle)' : undefined,
                  padding: '4px',
                  minHeight: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: dayInfo.isToday
                    ? 'var(--accent-bg-subtle)'
                    : undefined,
                  transition: 'background 0.15s',
                }}
              >
                {/* Day Number */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    padding: '2px 4px',
                    marginBottom: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: dayInfo.isToday ? 700 : 500,
                      color: dayInfo.isToday
                        ? 'var(--accent)'
                        : dayInfo.isCurrentMonth
                          ? 'var(--text-primary)'
                          : 'var(--text-dimmed)',
                      ...(dayInfo.isToday
                        ? {
                            background: 'var(--accent-bg-strong)',
                            borderRadius: '6px',
                            padding: '1px 6px',
                          }
                        : {}),
                    }}
                  >
                    {dayInfo.date.getDate()}
                  </span>
                </div>

                {/* Cards */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    flex: 1,
                    overflow: 'hidden',
                  }}
                >
                  {visibleCards.map((card) => {
                    const status = getCardStatus(card);
                    const colors = STATUS_COLORS[status];

                    return (
                      <button
                        key={card.id}
                        onClick={() => onCardClick(card)}
                        title={`${card.title} (${card.listTitle})`}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                          fontSize: '10px',
                          fontWeight: 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s',
                          lineHeight: '1.4',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.85';
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {card.isCompleted && (
                          <span style={{ marginRight: '3px' }}>&#10003;</span>
                        )}
                        {card.title}
                      </button>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <span
                      style={{
                        fontSize: '9px',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        padding: '1px 0',
                        fontWeight: 500,
                      }}
                    >
                      +{hiddenCount} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          padding: '8px 16px',
          borderRadius: '10px',
          background: 'var(--surface-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-default)',
        }}
      >
        {[
          { label: 'Atrasado', status: 'overdue' as const },
          { label: 'Hoje', status: 'today' as const },
          { label: 'A fazer', status: 'upcoming' as const },
          { label: 'Concluído', status: 'completed' as const },
        ].map(({ label, status }) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                background: STATUS_COLORS[status].bg,
                border: `1px solid ${STATUS_COLORS[status].border}`,
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
