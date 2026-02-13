import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { workspaceService } from '../services/workspaceService';
import { boardService } from '../services/boardService';
import { useAuthStore } from '../store/authStore';
import WorkspaceMembersModal from '../components/WorkspaceMembersModal';

// Inject keyframes once
const dpStyleId = 'dashboard-page-keyframes';
function injectDashboardKeyframes() {
  if (document.getElementById(dpStyleId)) return;
  const style = document.createElement('style');
  style.id = dpStyleId;
  style.textContent = `
    @keyframes dp-fadeInUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes dp-fadeInScale {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes dp-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Sidebar scrollbar */
    .dp-workspace-list::-webkit-scrollbar { width: 4px; }
    .dp-workspace-list::-webkit-scrollbar-thumb { background: rgba(102, 126, 234, 0.2); border-radius: 2px; }

    /* Main scrollbar */
    .dp-main::-webkit-scrollbar { width: 6px; }
    .dp-main::-webkit-scrollbar-track { background: transparent; }
    .dp-main::-webkit-scrollbar-thumb { background: rgba(102, 126, 234, 0.15); border-radius: 3px; }
    .dp-main::-webkit-scrollbar-thumb:hover { background: rgba(102, 126, 234, 0.25); }

    /* Favorites row scrollbar */
    .dp-favorites-row::-webkit-scrollbar { height: 4px; }
    .dp-favorites-row::-webkit-scrollbar-thumb { background: rgba(102, 126, 234, 0.15); border-radius: 2px; }

    /* Search bar focus styling */
    .dp-search-bar:focus-within {
      border-color: rgba(102, 126, 234, 0.3) !important;
      background: rgba(25, 28, 40, 0.8) !important;
      box-shadow: 0 0 20px rgba(102, 126, 234, 0.08) !important;
    }

    /* Board card hover effects */
    .dp-board-card:hover .dp-board-overlay {
      background: linear-gradient(160deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.3) 100%) !important;
    }
    .dp-board-card:hover .dp-board-menu-btn {
      opacity: 0.7 !important;
    }
    .dp-board-card:hover .dp-board-fav-btn {
      opacity: 1 !important;
    }
    .dp-board-menu-btn:hover {
      opacity: 1 !important;
      background: rgba(255,255,255,0.2) !important;
    }

    /* Fav card hover */
    .dp-fav-card:hover .dp-fav-card-overlay {
      background: linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 100%) !important;
    }

    /* Create board card hover */
    .dp-board-card-new:hover {
      border-color: rgba(102, 126, 234, 0.4) !important;
      background: rgba(102, 126, 234, 0.06) !important;
      transform: translateY(-2px);
    }
    .dp-board-card-new:hover .dp-new-icon {
      background: rgba(102, 126, 234, 0.2) !important;
      transform: rotate(90deg);
    }

    /* Nav item hover */
    .dp-nav-item:hover {
      color: #c8cad0 !important;
      background: rgba(255, 255, 255, 0.04);
    }

    /* Workspace sidebar item hover */
    .dp-ws-sidebar-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    /* User card hover */
    .dp-user-card:hover {
      border-color: rgba(102, 126, 234, 0.15) !important;
      background: rgba(25, 28, 40, 0.8) !important;
    }

    /* Stat card hover */
    .dp-stat-card:hover {
      border-color: rgba(102, 126, 234, 0.12) !important;
      background: rgba(25, 28, 40, 0.6) !important;
    }

    /* Notification btn hover */
    .dp-notif-btn:hover {
      color: #b8bcc8 !important;
      border-color: rgba(102, 126, 234, 0.2) !important;
    }

    /* Section add btn hover */
    .dp-section-btn:hover {
      background: rgba(102, 126, 234, 0.25) !important;
      transform: scale(1.1);
    }

    /* WS more btn hover */
    .dp-ws-more-btn:hover {
      background: rgba(255, 255, 255, 0.05) !important;
      color: #b8bcc8 !important;
    }

    /* Logout btn hover */
    .dp-logout-btn:hover {
      color: #ef4444 !important;
      background: rgba(239, 68, 68, 0.1) !important;
    }
  `;
  document.head.appendChild(style);
}

// Dashboard Page Component
export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState<string | null>(null);
  const [boardMenuOpen, setBoardMenuOpen] = useState<string | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [editingBoard, setEditingBoard] = useState<{ id: string; name: string; color: string } | null>(null);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState<{ workspaceId: string } | null>(null);
  const [boardName, setBoardName] = useState('');
  const [boardColor, setBoardColor] = useState('#667eea');
  const [favoriteWorkspaces, setFavoriteWorkspaces] = useState<string[]>(() => {
    const saved = localStorage.getItem('favoriteWorkspaces');
    return saved ? JSON.parse(saved) : [];
  });
  const [favoriteBoards, setFavoriteBoards] = useState<string[]>(() => {
    const saved = localStorage.getItem('favoriteBoards');
    return saved ? JSON.parse(saved) : [];
  });
  const [workspaceMembersModal, setWorkspaceMembersModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Inject keyframes on mount
  useEffect(() => {
    injectDashboardKeyframes();
  }, []);

  // Ctrl+K shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('favoriteWorkspaces', JSON.stringify(favoriteWorkspaces));
  }, [favoriteWorkspaces]);

  useEffect(() => {
    localStorage.setItem('favoriteBoards', JSON.stringify(favoriteBoards));
  }, [favoriteBoards]);

  const toggleFavoriteWorkspace = (workspaceId: string) => {
    setFavoriteWorkspaces(prev =>
      prev.includes(workspaceId)
        ? prev.filter(id => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };

  const toggleFavoriteBoard = (boardId: string) => {
    setFavoriteBoards(prev =>
      prev.includes(boardId)
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    );
  };

  const { data, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getWorkspaces(),
  });

  // Fetch boards for all workspaces
  const workspaces = data?.workspaces || [];
  const boardQueries = useQuery({
    queryKey: ['allBoards', workspaces.map(w => w.id)],
    queryFn: async () => {
      const results = await Promise.all(
        workspaces.map(workspace =>
          boardService.getBoards(workspace.id).then(data => ({
            workspaceId: workspace.id,
            boards: data.boards
          }))
        )
      );
      return results;
    },
    enabled: workspaces.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      workspaceService.createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setShowModal(false);
      setName('');
      setDescription('');
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (id: string) => workspaceService.deleteWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setWorkspaceMenuOpen(null);
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
      workspaceService.updateWorkspace(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setEditingWorkspace(null);
    },
  });

  const createBoardMutation = useMutation({
    mutationFn: (data: { workspaceId: string; name: string; backgroundColor?: string }) =>
      boardService.createBoard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allBoards'] });
      setShowCreateBoardModal(null);
      setBoardName('');
      setBoardColor('#667eea');
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; backgroundColor?: string } }) =>
      boardService.updateBoard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allBoards'] });
      setEditingBoard(null);
      setBoardMenuOpen(null);
    },
  });

  const deleteBoardMutation = useMutation({
    mutationFn: (id: string) => boardService.deleteBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allBoards'] });
      setBoardMenuOpen(null);
    },
  });

  const reorderWorkspacesMutation = useMutation({
    mutationFn: (workspaces: { id: string; position: number }[]) =>
      workspaceService.reorderWorkspaces(workspaces),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });

  const handleWorkspaceDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(workspaces);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedWorkspaces = items.map((workspace, index) => ({
      id: workspace.id,
      position: index,
    }));

    // Optimistic update
    queryClient.setQueryData(['workspaces'], { workspaces: items });

    // Persist to backend
    reorderWorkspacesMutation.mutate(updatedWorkspaces);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate({ name, description });
    }
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    if (confirm('Tem certeza que deseja deletar este workspace? Todos os boards serao perdidos!')) {
      deleteWorkspaceMutation.mutate(workspaceId);
    }
  };

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  const getBoardsForWorkspace = (workspaceId: string) => {
    const workspaceData = boardQueries.data?.find(w => w.workspaceId === workspaceId);
    return workspaceData?.boards || [];
  };

  // Workspace icon colors - cycling through different colors
  const workspaceIconColors = [
    { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#667eea' },
    { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#f093fb' },
    { bg: 'linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)', color: '#0093E9' },
    { bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', color: '#fcb69f' },
    { bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', color: '#a8edea' },
  ];

  // Board colors palette
  const boardColorClasses = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // blue
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // pink
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', // purple
    'linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)', // teal
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // orange
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // green
  ];

  // Compute stats
  const totalBoards = workspaces.reduce((sum, ws) => sum + getBoardsForWorkspace(ws.id).length, 0);

  // Get initials from workspace name (first 2 letters)
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  // Get user initials
  const userInitials = user ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : '';

  // Get all favorite board objects (for the favorites section)
  const allBoards = workspaces.flatMap(ws =>
    getBoardsForWorkspace(ws.id).map(b => ({ ...b, workspaceName: ws.name, workspaceId: ws.id }))
  );
  const favoriteBoardObjects = allBoards.filter(b => favoriteBoards.includes(b.id));

  // Filter boards by search query
  const filterBoards = (boards: any[]) => {
    if (!searchQuery.trim()) return boards;
    const q = searchQuery.toLowerCase();
    return boards.filter((b: any) => b.name.toLowerCase().includes(q));
  };

  return (
    <>
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#0f1117',
      color: '#e4e6eb',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* ===== SIDEBAR ===== */}
      <div style={{
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(17, 19, 28, 0.85)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(102, 126, 234, 0.08)',
        padding: '20px 14px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Sidebar subtle glow */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.06) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Brand */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          marginBottom: 24,
          position: 'relative',
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
          }}>
            <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <span style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: -0.3,
            background: 'linear-gradient(135deg, #e4e6eb 0%, #b8bcc8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>VersatlyTask</span>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 }}>
          <Link
            to="/dashboard"
            className="dp-nav-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 10,
              color: 'white',
              fontSize: 13.5,
              fontWeight: 500,
              textDecoration: 'none',
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.18) 0%, rgba(118, 75, 162, 0.12) 100%)',
            }}
          >
            {/* Active left bar indicator */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: 20,
              borderRadius: '0 3px 3px 0',
              background: 'linear-gradient(180deg, #667eea, #764ba2)',
            }} />
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Home</span>
          </Link>

          <Link
            to="/boards"
            className="dp-nav-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 10,
              color: '#8b8fa3',
              fontSize: 13.5,
              fontWeight: 500,
              textDecoration: 'none',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <span>Meus Boards</span>
            <span style={{
              marginLeft: 'auto',
              background: 'rgba(102, 126, 234, 0.2)',
              color: '#667eea',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 10,
            }}>{totalBoards}</span>
          </Link>

          <Link
            to="/favorites"
            className="dp-nav-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 10,
              color: '#8b8fa3',
              fontSize: 13.5,
              fontWeight: 500,
              textDecoration: 'none',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>Favoritos</span>
            <span style={{
              marginLeft: 'auto',
              background: 'rgba(102, 126, 234, 0.2)',
              color: '#667eea',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 10,
            }}>{favoriteBoards.length}</span>
          </Link>
        </div>

        {/* Sidebar divider */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.12), transparent)',
          margin: '4px 12px 16px',
        }} />

        {/* Workspace section header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          marginBottom: 8,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: '#5a5f73',
          }}>Workspaces</span>
          <button
            onClick={() => setShowModal(true)}
            className="dp-section-btn"
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: 'none',
              background: 'rgba(102, 126, 234, 0.12)',
              color: '#667eea',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            title="Criar novo workspace"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
          </button>
        </div>

        {/* Workspace list */}
        <div className="dp-workspace-list" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flex: 1,
          overflowY: 'auto',
        }}>
          {workspaces.map((workspace, idx) => {
            const colorScheme = workspaceIconColors[idx % workspaceIconColors.length];
            const boardCount = getBoardsForWorkspace(workspace.id).length;
            return (
              <div
                key={workspace.id}
                className="dp-ws-sidebar-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'white',
                  background: colorScheme.bg,
                }}>{getInitials(workspace.name)}</div>
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#b8bcc8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{workspace.name}</span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  color: '#5a5f73',
                }}>{boardCount}</span>
              </div>
            );
          })}
        </div>

        {/* User profile at bottom */}
        <div style={{
          marginTop: 'auto',
          paddingTop: 16,
          borderTop: '1px solid rgba(102, 126, 234, 0.08)',
        }}>
          <div className="dp-user-card" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(17, 19, 28, 0.6)',
            border: '1px solid rgba(102, 126, 234, 0.06)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
            }}>{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#e4e6eb',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{user?.name}</div>
              <div style={{
                fontSize: 11,
                color: '#5a5f73',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{user?.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="dp-logout-btn"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: 'none',
                background: 'transparent',
                color: '#5a5f73',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              title="Sair"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="dp-main" style={{
        flex: 1,
        overflowY: 'auto',
        position: 'relative',
      }}>
        {/* Subtle background pattern */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 260,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(102, 126, 234, 0.06) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.04) 0%, transparent 40%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '32px 40px',
          maxWidth: 1400,
        }}>
          {/* Top Bar / Greeting */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 32,
            animation: 'dp-fadeInUp 0.4s ease-out forwards',
          }}>
            <div>
              <h1 style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: -0.5,
                marginBottom: 4,
                color: '#e4e6eb',
                margin: 0,
              }}>
                {'Ola, '}
                <span style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>{user?.name}</span>
              </h1>
              <p style={{ fontSize: 14, color: '#6b7084', margin: 0, marginTop: 4 }}>
                Aqui esta o resumo dos seus workspaces e boards
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Search bar */}
              <div className="dp-search-bar" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 16px',
                borderRadius: 10,
                background: 'rgba(25, 28, 40, 0.6)',
                border: '1px solid rgba(102, 126, 234, 0.08)',
                width: 280,
                transition: 'all 0.2s ease',
              }}>
                <svg width="16" height="16" fill="none" stroke="#5a5f73" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar boards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: '#e4e6eb',
                    fontSize: 13,
                    width: '100%',
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{
                  fontSize: 10,
                  color: '#4a4e63',
                  border: '1px solid rgba(102, 126, 234, 0.12)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  flexShrink: 0,
                }}>Ctrl+K</span>
              </div>

              {/* Notification bell */}
              <button className="dp-notif-btn" style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid rgba(102, 126, 234, 0.08)',
                background: 'rgba(25, 28, 40, 0.6)',
                color: '#5a5f73',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                position: 'relative',
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#667eea',
                  border: '2px solid #0f1117',
                }} />
              </button>

              {/* Create workspace button */}
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 4px 16px rgba(102, 126, 234, 0.25)',
                  fontFamily: 'inherit',
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
                Novo Workspace
              </button>
            </div>
          </div>

          {isLoading || boardQueries.isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{
                display: 'inline-block',
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '2px solid transparent',
                borderBottomColor: '#667eea',
                animation: 'dp-spin 1s linear infinite',
              }} />
            </div>
          ) : workspaces.length === 0 ? (
            /* ===== EMPTY STATE ===== */
            <div style={{
              textAlign: 'center',
              padding: '80px 40px',
              background: 'rgba(25, 28, 40, 0.3)',
              borderRadius: 20,
              border: '1px dashed rgba(102, 126, 234, 0.12)',
            }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: 'rgba(102, 126, 234, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="36" height="36" fill="none" stroke="#667eea" viewBox="0 0 24 24" style={{ opacity: 0.6 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#e4e6eb', marginBottom: 8 }}>
                Nenhum workspace encontrado
              </div>
              <div style={{ fontSize: 14, color: '#6b7084', marginBottom: 24, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
                Crie seu primeiro workspace para organizar seus boards e tarefas.
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 28px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                  fontFamily: 'inherit',
                }}
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
                Criar Primeiro Workspace
              </button>
            </div>
          ) : (
            <>
              {/* ===== QUICK STATS ===== */}
              <div style={{
                display: 'flex',
                gap: 14,
                marginBottom: 32,
                animation: 'dp-fadeInUp 0.4s ease-out forwards',
                animationDelay: '0.05s',
                opacity: 0,
              }}>
                {/* Workspaces stat */}
                <div className="dp-stat-card" style={{
                  flex: 1,
                  padding: '16px 20px',
                  borderRadius: 14,
                  background: 'rgba(25, 28, 40, 0.4)',
                  border: '1px solid rgba(102, 126, 234, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: 'rgba(102, 126, 234, 0.1)', color: '#667eea',
                  }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#e4e6eb', lineHeight: 1 }}>{workspaces.length}</div>
                    <div style={{ fontSize: 12, color: '#6b7084', marginTop: 2 }}>Workspaces</div>
                  </div>
                </div>

                {/* Boards stat */}
                <div className="dp-stat-card" style={{
                  flex: 1,
                  padding: '16px 20px',
                  borderRadius: 14,
                  background: 'rgba(25, 28, 40, 0.4)',
                  border: '1px solid rgba(102, 126, 234, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: 'rgba(240, 147, 251, 0.1)', color: '#f093fb',
                  }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#e4e6eb', lineHeight: 1 }}>{totalBoards}</div>
                    <div style={{ fontSize: 12, color: '#6b7084', marginTop: 2 }}>Boards</div>
                  </div>
                </div>

                {/* Tarefas ativas stat */}
                <div className="dp-stat-card" style={{
                  flex: 1,
                  padding: '16px 20px',
                  borderRadius: 14,
                  background: 'rgba(25, 28, 40, 0.4)',
                  border: '1px solid rgba(102, 126, 234, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: 'rgba(168, 237, 234, 0.1)', color: '#a8edea',
                  }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#e4e6eb', lineHeight: 1 }}>-</div>
                    <div style={{ fontSize: 12, color: '#6b7084', marginTop: 2 }}>Tarefas ativas</div>
                  </div>
                </div>

                {/* Favoritos stat */}
                <div className="dp-stat-card" style={{
                  flex: 1,
                  padding: '16px 20px',
                  borderRadius: 14,
                  background: 'rgba(25, 28, 40, 0.4)',
                  border: '1px solid rgba(102, 126, 234, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  transition: 'all 0.2s',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24',
                  }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#e4e6eb', lineHeight: 1 }}>{favoriteBoards.length}</div>
                    <div style={{ fontSize: 12, color: '#6b7084', marginTop: 2 }}>Favoritos</div>
                  </div>
                </div>
              </div>

              {/* ===== FAVORITES SECTION ===== */}
              {favoriteBoardObjects.length > 0 && (
                <div style={{
                  animation: 'dp-fadeInUp 0.4s ease-out forwards',
                  animationDelay: '0.1s',
                  opacity: 0,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#e4e6eb',
                    }}>
                      <svg width="18" height="18" fill="#667eea" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Favoritos
                    </div>
                  </div>
                  <div className="dp-favorites-row" style={{
                    display: 'flex',
                    gap: 12,
                    marginBottom: 36,
                    overflowX: 'auto',
                    paddingBottom: 4,
                  }}>
                    {favoriteBoardObjects.map((board, i) => {
                      const boardBg = board.backgroundColor || boardColorClasses[i % boardColorClasses.length];
                      return (
                        <Link
                          key={board.id}
                          to={`/board/${board.id}`}
                          className="dp-fav-card"
                          style={{
                            flexShrink: 0,
                            width: 200,
                            height: 80,
                            borderRadius: 12,
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                            textDecoration: 'none',
                            background: boardBg,
                          }}
                        >
                          <div className="dp-fav-card-overlay" style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 100%)',
                            transition: 'all 0.3s',
                          }} />
                          <span style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: '#fbbf24',
                            zIndex: 2,
                          }}>
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </span>
                          <div style={{
                            position: 'relative',
                            zIndex: 1,
                            padding: '12px 14px',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}>
                            <div style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'white',
                              textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            }}>{board.name}</div>
                            <div style={{
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.7)',
                            }}>{board.workspaceName}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===== WORKSPACE SECTIONS (Drag & Drop) ===== */}
              <DragDropContext onDragEnd={handleWorkspaceDragEnd}>
                <Droppable droppableId="workspaces" type="WORKSPACE">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                    >
                      {workspaces.map((workspace, index) => {
                        const allWsBoards = getBoardsForWorkspace(workspace.id);
                        const boards = filterBoards(allWsBoards);
                        const isFavorite = favoriteWorkspaces.includes(workspace.id);
                        const colorScheme = workspaceIconColors[index % workspaceIconColors.length];

                        return (
                          <Draggable
                            key={workspace.id}
                            draggableId={workspace.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  marginBottom: 36,
                                }}
                              >
                                <div style={{
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                  animation: 'dp-fadeInUp 0.4s ease-out forwards',
                                  animationDelay: `${0.15 + index * 0.05}s`,
                                }}>
                                  {/* Workspace Header */}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 14,
                                    marginBottom: 16,
                                  }}>
                                    {/* Drag Handle */}
                                    <div
                                      {...provided.dragHandleProps}
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 2,
                                        alignItems: 'center',
                                        cursor: 'grab',
                                        padding: 4,
                                        borderRadius: 4,
                                        opacity: 0.3,
                                        transition: 'opacity 0.2s',
                                      }}
                                      title="Arrastar para reordenar"
                                    >
                                      <div style={{ display: 'flex', gap: 3 }}>
                                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#5a5f73' }} />
                                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#5a5f73' }} />
                                      </div>
                                      <div style={{ display: 'flex', gap: 3 }}>
                                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#5a5f73' }} />
                                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#5a5f73' }} />
                                      </div>
                                      <div style={{ display: 'flex', gap: 3 }}>
                                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#5a5f73' }} />
                                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#5a5f73' }} />
                                      </div>
                                    </div>

                                    {/* Workspace icon with gradient + initials */}
                                    <div style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: 10,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      background: colorScheme.bg,
                                      boxShadow: `0 4px 12px ${colorScheme.color}4D`,
                                      fontSize: 14,
                                      fontWeight: 700,
                                      color: 'white',
                                    }}>{getInitials(workspace.name)}</div>

                                    {/* Title + star + count */}
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                                      {editingWorkspace?.id === workspace.id ? (
                                        <input
                                          type="text"
                                          value={editingWorkspace.name}
                                          onChange={(e) => setEditingWorkspace({ ...editingWorkspace, name: e.target.value })}
                                          onBlur={() => {
                                            if (editingWorkspace.name.trim()) {
                                              updateWorkspaceMutation.mutate({
                                                id: workspace.id,
                                                data: { name: editingWorkspace.name }
                                              });
                                            } else {
                                              setEditingWorkspace(null);
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              if (editingWorkspace.name.trim()) {
                                                updateWorkspaceMutation.mutate({
                                                  id: workspace.id,
                                                  data: { name: editingWorkspace.name }
                                                });
                                              }
                                            } else if (e.key === 'Escape') {
                                              setEditingWorkspace(null);
                                            }
                                          }}
                                          autoFocus
                                          style={{
                                            fontSize: 18,
                                            fontWeight: 600,
                                            color: '#e4e6eb',
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            background: 'transparent',
                                            border: '2px solid #667eea',
                                            outline: 'none',
                                            fontFamily: 'inherit',
                                          }}
                                        />
                                      ) : (
                                        <span style={{ fontSize: 18, fontWeight: 600, color: '#e4e6eb' }}>
                                          {workspace.name}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => toggleFavoriteWorkspace(workspace.id)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          color: isFavorite ? '#fbbf24' : '#5a5f73',
                                          transition: 'all 0.2s',
                                          padding: 0,
                                          display: 'flex',
                                          alignItems: 'center',
                                        }}
                                        title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                      >
                                        <svg
                                          width="16" height="16"
                                          fill={isFavorite ? 'currentColor' : 'none'}
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                        </svg>
                                      </button>
                                    </div>

                                    {/* Board count badge */}
                                    <span style={{
                                      fontSize: 12,
                                      color: '#5a5f73',
                                      background: 'rgba(90, 95, 115, 0.15)',
                                      padding: '3px 10px',
                                      borderRadius: 12,
                                    }}>{allWsBoards.length} boards</span>

                                    {/* Member avatars */}
                                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
                                      <div style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        border: '2px solid #0f1117',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: 'white',
                                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                      }}>{userInitials}</div>
                                    </div>

                                    {/* Three-dot menu */}
                                    <div style={{ position: 'relative' }}>
                                      <button
                                        onClick={() => setWorkspaceMenuOpen(workspaceMenuOpen === workspace.id ? null : workspace.id)}
                                        className="dp-ws-more-btn"
                                        style={{
                                          width: 30,
                                          height: 30,
                                          borderRadius: 8,
                                          border: 'none',
                                          background: 'transparent',
                                          color: '#5a5f73',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.2s',
                                        }}
                                      >
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                        </svg>
                                      </button>
                                      {workspaceMenuOpen === workspace.id && (
                                        <>
                                          <div
                                            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                                            onClick={() => setWorkspaceMenuOpen(null)}
                                          />
                                          <div style={{
                                            position: 'absolute',
                                            right: 0,
                                            marginTop: 8,
                                            width: 192,
                                            borderRadius: 12,
                                            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                            zIndex: 20,
                                            padding: '6px 0',
                                            background: 'rgba(25, 28, 40, 0.95)',
                                            backdropFilter: 'blur(20px)',
                                            border: '1px solid rgba(102, 126, 234, 0.1)',
                                          }}>
                                            <button
                                              onClick={() => {
                                                setEditingWorkspace({ id: workspace.id, name: workspace.name });
                                                setWorkspaceMenuOpen(null);
                                              }}
                                              style={{
                                                width: '100%',
                                                padding: '8px 16px',
                                                textAlign: 'left',
                                                fontSize: 13,
                                                color: '#e4e6eb',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                fontFamily: 'inherit',
                                                transition: 'background 0.15s',
                                              }}
                                              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'none'; }}
                                            >
                                              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                              Editar nome
                                            </button>
                                            <button
                                              onClick={() => {
                                                setWorkspaceMembersModal(workspace.id);
                                                setWorkspaceMenuOpen(null);
                                              }}
                                              style={{
                                                width: '100%',
                                                padding: '8px 16px',
                                                textAlign: 'left',
                                                fontSize: 13,
                                                color: '#e4e6eb',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                fontFamily: 'inherit',
                                                transition: 'background 0.15s',
                                              }}
                                              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'none'; }}
                                            >
                                              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                              </svg>
                                              Gerenciar membros
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (confirm('Tem certeza que deseja deletar este workspace? Todos os boards serao perdidos!')) {
                                                  deleteWorkspaceMutation.mutate(workspace.id);
                                                }
                                                setWorkspaceMenuOpen(null);
                                              }}
                                              style={{
                                                width: '100%',
                                                padding: '8px 16px',
                                                textAlign: 'left',
                                                fontSize: 13,
                                                color: '#ef4444',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                fontFamily: 'inherit',
                                                transition: 'background 0.15s',
                                              }}
                                              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                                              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'none'; }}
                                            >
                                              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                              </svg>
                                              Deletar workspace
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Board Grid */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                    gap: 14,
                                  }}>
                                    {boards.map((board: any, boardIndex: number) => {
                                      const isBoardFavorite = favoriteBoards.includes(board.id);
                                      const boardBg = board.backgroundColor || boardColorClasses[boardIndex % boardColorClasses.length];

                                      return (
                                        <div key={board.id} style={{ position: 'relative', animation: 'dp-fadeInScale 0.4s ease-out forwards', animationDelay: `${boardIndex * 0.05}s` }}>
                                          <Link
                                            to={`/board/${board.id}`}
                                            className="dp-board-card"
                                            style={{
                                              display: 'block',
                                              borderRadius: 12,
                                              overflow: 'hidden',
                                              position: 'relative',
                                              cursor: 'pointer',
                                              transition: 'all 0.25s ease',
                                              textDecoration: 'none',
                                              aspectRatio: '16 / 9',
                                              minHeight: 110,
                                              background: boardBg,
                                            }}
                                          >
                                            <div className="dp-board-overlay" style={{
                                              position: 'absolute',
                                              inset: 0,
                                              background: 'linear-gradient(160deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.45) 100%)',
                                              transition: 'all 0.3s',
                                            }} />
                                            <div style={{
                                              position: 'relative',
                                              zIndex: 1,
                                              padding: '14px 16px',
                                              height: '100%',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              justifyContent: 'space-between',
                                            }}>
                                              {/* Board card top */}
                                              <div style={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                justifyContent: 'space-between',
                                              }}>
                                                <span style={{
                                                  fontSize: 14,
                                                  fontWeight: 600,
                                                  color: 'white',
                                                  textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                                  flex: 1,
                                                }}>{board.name}</span>
                                                <button
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setBoardMenuOpen(boardMenuOpen === board.id ? null : board.id);
                                                  }}
                                                  className="dp-board-menu-btn"
                                                  style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: 6,
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: 0,
                                                    transition: 'all 0.2s',
                                                  }}
                                                >
                                                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                                                  </svg>
                                                </button>
                                              </div>
                                              {/* Board card bottom */}
                                              <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                              }}>
                                                <div style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 4,
                                                  fontSize: 11,
                                                  color: 'rgba(255,255,255,0.6)',
                                                }}>
                                                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                  </svg>
                                                  Atualizado recentemente
                                                </div>
                                                <button
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleFavoriteBoard(board.id);
                                                  }}
                                                  className="dp-board-fav-btn"
                                                  style={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: 6,
                                                    border: 'none',
                                                    background: 'rgba(255,255,255,0.15)',
                                                    backdropFilter: 'blur(8px)',
                                                    color: isBoardFavorite ? '#fbbf24' : 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: isBoardFavorite ? 1 : 0,
                                                    transition: 'all 0.2s',
                                                  }}
                                                >
                                                  <svg
                                                    width="13" height="13"
                                                    fill={isBoardFavorite ? 'currentColor' : 'none'}
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                  </svg>
                                                </button>
                                              </div>
                                            </div>
                                          </Link>

                                          {/* Board Menu Dropdown */}
                                          {boardMenuOpen === board.id && (
                                            <>
                                              <div
                                                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                                                onClick={() => setBoardMenuOpen(null)}
                                              />
                                              <div style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: 32,
                                                zIndex: 20,
                                                width: 192,
                                                borderRadius: 12,
                                                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                                padding: '6px 0',
                                                background: 'rgba(25, 28, 40, 0.95)',
                                                backdropFilter: 'blur(20px)',
                                                border: '1px solid rgba(102, 126, 234, 0.1)',
                                              }}>
                                                <button
                                                  onClick={() => {
                                                    setEditingBoard({ id: board.id, name: board.name, color: board.backgroundColor || boardBg });
                                                    setBoardMenuOpen(null);
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    padding: '8px 16px',
                                                    textAlign: 'left',
                                                    fontSize: 13,
                                                    color: '#e4e6eb',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    fontFamily: 'inherit',
                                                    transition: 'background 0.15s',
                                                  }}
                                                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'none'; }}
                                                >
                                                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                  </svg>
                                                  Editar board
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    if (confirm('Tem certeza que deseja deletar este board?')) {
                                                      deleteBoardMutation.mutate(board.id);
                                                    }
                                                    setBoardMenuOpen(null);
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    padding: '8px 16px',
                                                    textAlign: 'left',
                                                    fontSize: 13,
                                                    color: '#ef4444',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    fontFamily: 'inherit',
                                                    transition: 'background 0.15s',
                                                  }}
                                                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
                                                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'none'; }}
                                                >
                                                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                  </svg>
                                                  Deletar board
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}

                                    {/* Create Board Card */}
                                    <button
                                      onClick={() => setShowCreateBoardModal({ workspaceId: workspace.id })}
                                      className="dp-board-card-new"
                                      style={{
                                        borderRadius: 12,
                                        border: '1.5px dashed rgba(102, 126, 234, 0.2)',
                                        background: 'rgba(25, 28, 40, 0.3)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        cursor: 'pointer',
                                        transition: 'all 0.25s ease',
                                        minHeight: 110,
                                        aspectRatio: '16 / 9',
                                        fontFamily: 'inherit',
                                      }}
                                    >
                                      <div className="dp-new-icon" style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: 'rgba(102, 126, 234, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s',
                                      }}>
                                        <svg width="18" height="18" fill="none" stroke="#667eea" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                                        </svg>
                                      </div>
                                      <span style={{ fontSize: 12, fontWeight: 500, color: '#5a5f73' }}>Novo board</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </>
          )}
        </div>
      </div>
    </div>

      {/* ===== CREATE WORKSPACE MODAL ===== */}
      {showModal &&
        createPortal(
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
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => setShowModal(false)}
          >
            <div
              style={{
                borderRadius: 16,
                padding: 32,
                maxWidth: 420,
                width: '100%',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                background: 'rgba(25, 28, 40, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                margin: '0 16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#e4e6eb', margin: 0 }}>
                  Criar Workspace
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(45, 49, 66, 0.6)',
                    color: '#8b8fa3',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: '#8b8fa3',
                    marginBottom: 8,
                  }}>Nome do Workspace *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'rgba(15, 17, 23, 0.6)',
                      color: '#e4e6eb',
                      border: '2px solid rgba(102, 126, 234, 0.1)',
                      outline: 'none',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Ex: Meu Projeto"
                    required
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: '#8b8fa3',
                    marginBottom: 8,
                  }}>Descricao (opcional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'rgba(15, 17, 23, 0.6)',
                      color: '#e4e6eb',
                      border: '2px solid rgba(102, 126, 234, 0.1)',
                      outline: 'none',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      resize: 'none',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Descreva o proposito deste workspace..."
                    rows={3}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 10,
                      fontWeight: 500,
                      color: '#8b8fa3',
                      background: 'rgba(45, 49, 66, 0.4)',
                      border: '1px solid rgba(102, 126, 234, 0.1)',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || !name.trim()}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 10,
                      fontWeight: 600,
                      color: 'white',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      cursor: createMutation.isPending || !name.trim() ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      opacity: createMutation.isPending || !name.trim() ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {createMutation.isPending ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ===== CREATE BOARD MODAL ===== */}
      {showCreateBoardModal &&
        createPortal(
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
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => setShowCreateBoardModal(null)}
          >
            <div
              style={{
                borderRadius: 16,
                padding: 32,
                maxWidth: 420,
                width: '100%',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                background: 'rgba(25, 28, 40, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                margin: '0 16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#e4e6eb', margin: 0 }}>
                  Criar Board
                </h3>
                <button
                  onClick={() => setShowCreateBoardModal(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(45, 49, 66, 0.6)',
                    color: '#8b8fa3',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (boardName.trim() && showCreateBoardModal) {
                    createBoardMutation.mutate({
                      workspaceId: showCreateBoardModal.workspaceId,
                      name: boardName.trim(),
                      backgroundColor: boardColor,
                    });
                  }
                }}
              >
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: '#8b8fa3',
                    marginBottom: 8,
                  }}>Nome do Board *</label>
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'rgba(15, 17, 23, 0.6)',
                      color: '#e4e6eb',
                      border: '2px solid rgba(102, 126, 234, 0.1)',
                      outline: 'none',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    placeholder="Ex: Sprint Planning"
                    required
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: '#8b8fa3',
                    marginBottom: 8,
                  }}>Cor do Board</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['#667eea', '#f093fb', '#ffecd2', '#a8edea', '#fa709a', '#30cfd0'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBoardColor(color)}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          background: color,
                          border: boardColor === color ? '3px solid white' : 'none',
                          boxShadow: boardColor === color ? '0 0 0 2px #667eea' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateBoardModal(null)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 10,
                      fontWeight: 500,
                      color: '#8b8fa3',
                      background: 'rgba(45, 49, 66, 0.4)',
                      border: '1px solid rgba(102, 126, 234, 0.1)',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createBoardMutation.isPending || !boardName.trim()}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 10,
                      fontWeight: 600,
                      color: 'white',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      cursor: createBoardMutation.isPending || !boardName.trim() ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      opacity: createBoardMutation.isPending || !boardName.trim() ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {createBoardMutation.isPending ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ===== EDIT BOARD MODAL ===== */}
      {editingBoard &&
        createPortal(
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
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => setEditingBoard(null)}
          >
            <div
              style={{
                borderRadius: 16,
                padding: 32,
                maxWidth: 420,
                width: '100%',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                background: 'rgba(25, 28, 40, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(102, 126, 234, 0.1)',
                margin: '0 16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#e4e6eb', margin: 0 }}>
                  Editar Board
                </h3>
                <button
                  onClick={() => setEditingBoard(null)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(45, 49, 66, 0.6)',
                    color: '#8b8fa3',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingBoard && editingBoard.name.trim()) {
                    updateBoardMutation.mutate({
                      id: editingBoard.id,
                      data: {
                        name: editingBoard.name.trim(),
                        backgroundColor: editingBoard.color,
                      },
                    });
                  }
                }}
              >
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: '#8b8fa3',
                    marginBottom: 8,
                  }}>Nome do Board *</label>
                  <input
                    type="text"
                    value={editingBoard.name}
                    onChange={(e) => setEditingBoard({ ...editingBoard, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: 'rgba(15, 17, 23, 0.6)',
                      color: '#e4e6eb',
                      border: '2px solid rgba(102, 126, 234, 0.1)',
                      outline: 'none',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: '#8b8fa3',
                    marginBottom: 8,
                  }}>Cor do Board</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['#667eea', '#f093fb', '#ffecd2', '#a8edea', '#fa709a', '#30cfd0'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditingBoard({ ...editingBoard, color })}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          background: color,
                          border: editingBoard.color === color ? '3px solid white' : 'none',
                          boxShadow: editingBoard.color === color ? '0 0 0 2px #667eea' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setEditingBoard(null)}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 10,
                      fontWeight: 500,
                      color: '#8b8fa3',
                      background: 'rgba(45, 49, 66, 0.4)',
                      border: '1px solid rgba(102, 126, 234, 0.1)',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updateBoardMutation.isPending || !editingBoard.name.trim()}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 10,
                      fontWeight: 600,
                      color: 'white',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      cursor: updateBoardMutation.isPending || !editingBoard.name.trim() ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      opacity: updateBoardMutation.isPending || !editingBoard.name.trim() ? 0.5 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {updateBoardMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Workspace Members Modal */}
      {workspaceMembersModal && workspaces.find(w => w.id === workspaceMembersModal) && (
        <WorkspaceMembersModal
          workspace={workspaces.find(w => w.id === workspaceMembersModal)!}
          isOpen={true}
          onClose={() => setWorkspaceMembersModal(null)}
        />
      )}
    </>
  );
}
