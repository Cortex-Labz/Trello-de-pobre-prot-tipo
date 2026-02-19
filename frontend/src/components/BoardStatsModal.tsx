import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Board } from '../types';

interface BoardStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
}

// Color palette for charts
const CHART_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#0093E9',
  '#80D0C7', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div style={{
        padding: '8px 12px',
        borderRadius: 8,
        background: 'var(--surface-dropdown)',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {data.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          {data.value} {data.value === 1 ? 'card' : 'cards'} ({data.payload.pct}%)
        </div>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.08) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomLegend = ({ payload }: any) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'center', marginTop: 8 }}>
    {payload?.map((entry: any, idx: number) => (
      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.value}</span>
      </div>
    ))}
  </div>
);

function DonutChart({ data, title, emptyMessage }: { data: { name: string; value: number; color: string; pct: string }[]; title: string; emptyMessage: string }) {
  if (data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <div style={{
        background: 'var(--surface-input)',
        borderRadius: 12,
        padding: 20,
        textAlign: 'center',
        border: '1px solid var(--border-accent)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '20px 0' }}>{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--surface-input)',
      borderRadius: 12,
      padding: '16px 12px 8px',
      border: '1px solid var(--border-accent)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 4 }}>{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart style={{ outline: 'none' }} onClick={undefined}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ outline: 'none', boxShadow: 'none', border: 'none', background: 'transparent' }}
          />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function BoardStatsModal({ isOpen, onClose, board }: BoardStatsModalProps) {
  const stats = useMemo(() => {
    const lists = board.lists?.filter(l => !l.isArchived) || [];
    const allCards = lists.flatMap(l => l.cards?.filter(c => !c.isArchived) || []);
    const totalCards = allCards.length;

    // Cards per list
    const cardsByList = lists.map((list, idx) => {
      const count = list.cards?.filter(c => !c.isArchived).length || 0;
      return {
        name: list.title,
        value: count,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        pct: totalCards > 0 ? ((count / totalCards) * 100).toFixed(1) : '0',
      };
    }).filter(d => d.value > 0);

    // Cards per label
    const labelMap = new Map<string, { name: string; color: string; count: number }>();
    allCards.forEach(card => {
      card.labels?.forEach(cl => {
        const key = cl.label?.id || cl.labelId;
        const existing = labelMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          labelMap.set(key, {
            name: cl.label?.name || 'Sem nome',
            color: cl.label?.color || '#667eea',
            count: 1,
          });
        }
      });
    });
    const cardsByLabel = Array.from(labelMap.values()).map(l => ({
      name: l.name,
      value: l.count,
      color: l.color,
      pct: totalCards > 0 ? ((l.count / totalCards) * 100).toFixed(1) : '0',
    }));

    // Cards per member
    const memberMap = new Map<string, { name: string; count: number }>();
    let unassigned = 0;
    allCards.forEach(card => {
      if (!card.members || card.members.length === 0) {
        unassigned++;
      } else {
        card.members.forEach(cm => {
          const key = cm.userId;
          const existing = memberMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            memberMap.set(key, {
              name: cm.user?.name || 'Desconhecido',
              count: 1,
            });
          }
        });
      }
    });
    const cardsByMember = [
      ...Array.from(memberMap.values()).map((m, idx) => ({
        name: m.name,
        value: m.count,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        pct: totalCards > 0 ? ((m.count / totalCards) * 100).toFixed(1) : '0',
      })),
      ...(unassigned > 0 ? [{
        name: 'Sem membro',
        value: unassigned,
        color: '#6b7280',
        pct: totalCards > 0 ? ((unassigned / totalCards) * 100).toFixed(1) : '0',
      }] : []),
    ];

    // Cards by due date status
    const now = new Date();
    let overdue = 0;
    let dueToday = 0;
    let dueSoon = 0; // next 7 days
    let onTime = 0;
    let noDue = 0;
    allCards.forEach(card => {
      if (!card.dueDate) {
        noDue++;
        return;
      }
      const due = new Date(card.dueDate);
      const diffMs = due.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (card.isCompleted) {
        onTime++;
      } else if (diffDays < 0) {
        overdue++;
      } else if (diffDays < 1) {
        dueToday++;
      } else if (diffDays <= 7) {
        dueSoon++;
      } else {
        onTime++;
      }
    });
    const cardsByDue = [
      { name: 'Atrasado', value: overdue, color: '#ef4444', pct: totalCards > 0 ? ((overdue / totalCards) * 100).toFixed(1) : '0' },
      { name: 'Hoje', value: dueToday, color: '#f59e0b', pct: totalCards > 0 ? ((dueToday / totalCards) * 100).toFixed(1) : '0' },
      { name: 'Próx. 7 dias', value: dueSoon, color: '#3b82f6', pct: totalCards > 0 ? ((dueSoon / totalCards) * 100).toFixed(1) : '0' },
      { name: 'No prazo', value: onTime, color: '#10b981', pct: totalCards > 0 ? ((onTime / totalCards) * 100).toFixed(1) : '0' },
      { name: 'Sem prazo', value: noDue, color: '#6b7280', pct: totalCards > 0 ? ((noDue / totalCards) * 100).toFixed(1) : '0' },
    ].filter(d => d.value > 0);

    // Completion stats
    const completed = allCards.filter(c => c.isCompleted).length;
    const incomplete = totalCards - completed;

    return { cardsByList, cardsByLabel, cardsByMember, cardsByDue, totalCards, completed, incomplete, totalLists: lists.length };
  }, [board]);

  if (!isOpen) return null;

  return (
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
          padding: 28,
          maxWidth: 680,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--modal-shadow)',
          background: 'var(--surface-dropdown)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-accent)',
          margin: '0 16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Estatísticas
            </h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{board.name}</div>
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

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total Cards', value: stats.totalCards, color: '#667eea' },
            { label: 'Listas', value: stats.totalLists, color: '#8b5cf6' },
            { label: 'Concluídos', value: stats.completed, color: '#10b981' },
            { label: 'Pendentes', value: stats.incomplete, color: '#f59e0b' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: 'var(--surface-input)',
                borderRadius: 10,
                padding: '12px 10px',
                textAlign: 'center',
                border: '1px solid var(--border-accent)',
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        {stats.totalCards > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Progresso geral</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                {stats.totalCards > 0 ? ((stats.completed / stats.totalCards) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div style={{
              height: 8,
              borderRadius: 4,
              background: 'var(--surface-subtle)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                borderRadius: 4,
                background: 'linear-gradient(90deg, #10b981, #34d399)',
                width: `${stats.totalCards > 0 ? (stats.completed / stats.totalCards) * 100 : 0}%`,
                transition: 'width 0.8s ease-out',
              }} />
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DonutChart
            data={stats.cardsByList}
            title="Cards por Lista"
            emptyMessage="Nenhum card ainda"
          />
          <DonutChart
            data={stats.cardsByLabel}
            title="Cards por Label"
            emptyMessage="Nenhuma label usada"
          />
          <DonutChart
            data={stats.cardsByMember}
            title="Cards por Membro"
            emptyMessage="Nenhum membro atribuído"
          />
          <DonutChart
            data={stats.cardsByDue}
            title="Cards por Prazo"
            emptyMessage="Nenhum prazo definido"
          />
        </div>
      </div>
    </div>
  );
}
