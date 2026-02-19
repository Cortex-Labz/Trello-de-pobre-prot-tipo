import { memo } from 'react';
import type { Card } from '../../types';

// Helper function to format completion time
export const formatCompletionTime = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return '';

  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return `${seconds} seg`;
  } else if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
};

const CardItem = memo(({ card, formatTime, onToggleComplete }: { card: Card; formatTime: (minutes: number | null | undefined) => string; onToggleComplete?: (cardId: string, isCompleted: boolean) => void }) => {
  return (
    <>
      {/* Card Cover Image - on top, before title */}
      {card.coverAttachmentId && card.attachments && (() => {
        const coverImage = card.attachments.find(att => att.id === card.coverAttachmentId);
        if (coverImage) {
          return (
            <div className="overflow-hidden relative group" style={{ margin: '-10px -12px 8px -12px', borderRadius: '10px 10px 0 0' }}>
              <img
                src={coverImage.url}
                alt={coverImage.name}
                className="w-full object-cover"
                style={{ maxHeight: '140px', display: 'block' }}
              />
            </div>
          );
        }
        return null;
      })()}

      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Completion Checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete?.(card.id, !card.isCompleted);
            }}
            className="flex-shrink-0 flex items-center justify-center transition-all hover:scale-110"
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: card.isCompleted ? 'none' : '2px solid var(--border-strong)',
              background: card.isCompleted ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            }}
            title={card.isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
          >
            {card.isCompleted && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>
          <h4
            className="font-medium leading-snug flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{
              color: card.isCompleted ? 'var(--text-disabled)' : 'var(--text-primary)',
              fontSize: '13px',
              textDecoration: card.isCompleted ? 'line-through' : 'none',
            }}
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
        </div>

        {/* Due Date - Clock Icon */}
        {card.dueDate && (
          <div className="relative group flex-shrink-0">
            <div
              className="flex items-center justify-center w-5 h-5 transition-all hover:scale-110 cursor-pointer"
              style={{ color: '#EAB308' }}
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
              className="absolute top-full right-0 mt-2 px-2 py-1 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg"
              style={{ zIndex: 99999, background: 'var(--surface-dropdown)' }}
            >
              {new Date(card.dueDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        )}
      </div>

      {card.description && (
        <p className="mt-1 line-clamp-2 leading-snug" style={{ color: 'var(--text-disabled)', fontSize: '11.5px' }}>
          {card.description}
        </p>
      )}

      {/* Checklist Progress */}
      {card.checklists && card.checklists.length > 0 && (() => {
        const totalItems = card.checklists.reduce((sum, cl) => sum + (cl.items?.length || 0), 0);
        const completedItems = card.checklists.reduce((sum, cl) => sum + (cl.items?.filter(i => i.isCompleted).length || 0), 0);
        if (totalItems === 0) return null;
        const percent = Math.round((completedItems / totalItems) * 100);
        const allDone = completedItems === totalItems;
        return (
          <div className="flex items-center gap-1.5 mt-1.5" title={`${completedItems}/${totalItems} concluídos`}>
            <svg width="14" height="14" fill="none" stroke={allDone ? '#10b981' : 'var(--text-faint)'} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <div style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: 'var(--border-default)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${percent}%`,
                height: '100%',
                borderRadius: 2,
                background: allDone ? '#10b981' : 'var(--accent-highlight)',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: allDone ? '#10b981' : 'var(--text-faint)',
              flexShrink: 0,
            }}>{completedItems}/{totalItems}</span>
          </div>
        );
      })()}

      {/* Card Footer */}
      {((card.labels?.length || 0) > 0 || (card.members?.length || 0) > 0) && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {card.labels.slice(0, 3).map((cl) => (
                <div
                  key={cl.label.id}
                  className="px-2 py-0.5 rounded text-white font-semibold"
                  style={{ backgroundColor: cl.label.color, fontSize: '10px', lineHeight: '1.4' }}
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
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white font-bold"
                  style={{
                    background: 'var(--gradient-primary)',
                    fontSize: '9px',
                    marginLeft: '-4px',
                    border: '1.5px solid var(--surface-base)',
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

export default CardItem;
