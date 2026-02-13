import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { workspaceService } from '../services/workspaceService';
import { boardService } from '../services/boardService';
import { useAuthStore } from '../store/authStore';
import WorkspaceMembersModal from '../components/WorkspaceMembersModal';

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
    if (confirm('Tem certeza que deseja deletar este workspace? Todos os boards serão perdidos!')) {
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

  return (
    <>
    <div
      className="min-h-screen flex overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1a1d29 0%, #252a3d 50%, #1a1d29 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
      }}
    >
      {/* Sidebar */}
      <div
        className="w-64 flex-shrink-0 flex flex-col"
        style={{
          background: 'rgba(31, 35, 51, 0.7)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(102, 126, 234, 0.1)',
          padding: '20px',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ padding: '12px', marginBottom: '16px' }}>
          <div
            style={{
              color: '#e4e6eb',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: 0.7,
            }}
          >
            VersatlyTask
          </div>
        </div>

        <Link
          to="/dashboard"
          className="flex items-center gap-3 p-3 rounded-xl mb-2 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Home</span>
        </Link>

        <Link
          to="/boards"
          className="flex items-center gap-3 p-3 rounded-xl mb-2 relative overflow-hidden hover:translate-x-1"
          style={{
            color: '#b8bcc8',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span>Boards</span>
        </Link>

        <Link
          to="/favorites"
          className="flex items-center gap-3 p-3 rounded-xl mb-4 relative overflow-hidden hover:translate-x-1"
          style={{
            color: '#b8bcc8',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span>Favoritos</span>
        </Link>

        <div
          style={{
            height: '1px',
            background: '#2d3142',
            margin: '12px 0',
          }}
        />

        <div style={{ padding: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              color: '#e4e6eb',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: 0.7,
            }}
          >
            Workspaces
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: 'rgba(102, 126, 234, 0.2)',
              color: '#667eea',
            }}
            title="Criar novo workspace"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {workspaces.map((workspace, idx) => {
            const colorScheme = workspaceIconColors[idx % workspaceIconColors.length];
            return (
              <div
                key={workspace.id}
                className="flex items-center gap-3 p-3 rounded-xl relative overflow-hidden"
                style={{
                  color: '#b8bcc8',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: colorScheme.bg,
                    boxShadow: `0 4px 12px ${colorScheme.color}40`,
                  }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="truncate">{workspace.name}</span>
              </div>
            );
          })}
        </div>

        {/* User Profile / Logout */}
        <div
          style={{
            borderTop: '1px solid #2d3142',
            paddingTop: '12px',
            marginTop: '12px',
          }}
        >
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              background: 'rgba(20, 22, 33, 0.6)',
              border: '1px solid rgba(102, 126, 234, 0.1)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              {user && user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: '#e4e6eb' }}>
                {user?.name}
              </div>
              <div className="text-xs truncate" style={{ color: '#9ca3af' }}>
                {user?.email}
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/20"
              style={{ color: '#ef4444' }}
              title="Sair"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className="flex-1 overflow-y-auto p-10"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#e4e6eb' }}>
            Workspaces & Boards
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2.5 text-white rounded-xl font-semibold transition-all shadow-lg hover:translate-y-[-2px] flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Criar Workspace
            </button>
          </div>
        </div>

        {isLoading || boardQueries.isLoading ? (
          <div className="text-center py-12">
            <div
              className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: '#667eea' }}
            ></div>
          </div>
        ) : workspaces.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl"
            style={{
              background: 'rgba(45, 49, 66, 0.6)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <p className="mb-6 text-lg" style={{ color: '#b8bcc8' }}>
              Você ainda não tem workspaces. Crie um para começar!
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-8 py-3 text-white rounded-xl font-medium transition-all shadow-lg hover:translate-y-[-2px]"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              Criar Primeiro Workspace
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleWorkspaceDragEnd}>
            <Droppable droppableId="workspaces" type="WORKSPACE">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-10"
                >
                  {workspaces.map((workspace, index) => {
                    const boards = getBoardsForWorkspace(workspace.id);
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
                            }}
                          >
                            <div
                              className="animate-fade-in-up"
                              style={{
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                animation: 'fadeInUp 0.5s ease-out forwards',
                                animationDelay: `${index * 0.1}s`,
                              }}
                            >
                  {/* Workspace Section Header */}
                  <div className="flex items-center gap-4 mb-4">
                    {/* Drag Handle */}
                    <div
                      {...provided.dragHandleProps}
                      className="cursor-grab active:cursor-grabbing p-2 rounded-lg transition-all hover:bg-white/5"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        alignItems: 'center',
                      }}
                      title="Arrastar para reordenar"
                    >
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#5a5f73' }} />
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#5a5f73' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#5a5f73' }} />
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#5a5f73' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#5a5f73' }} />
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#5a5f73' }} />
                      </div>
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:rotate-[-5deg]"
                      style={{
                        background: 'rgba(45, 49, 66, 0.6)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(102, 126, 234, 0.2)',
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: colorScheme.color, filter: `drop-shadow(0 2px 4px ${colorScheme.color}66)` }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-3 flex-1">
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
                          className="text-xl font-semibold px-2 py-1 rounded bg-transparent border-2 border-blue-500 outline-none"
                          style={{ color: '#e4e6eb' }}
                        />
                      ) : (
                        <h2 className="text-xl font-semibold" style={{ color: '#e4e6eb' }}>
                          {workspace.name}
                        </h2>
                      )}
                      <button
                        onClick={() => toggleFavoriteWorkspace(workspace.id)}
                        className="w-6 h-6 flex items-center justify-center transition-all hover:scale-125 hover:rotate-[15deg]"
                        style={{
                          color: isFavorite ? '#fbbf24' : '#5a5f73',
                        }}
                        title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        <svg
                          className="w-5 h-5"
                          fill={isFavorite ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-sm" style={{ color: '#b8bcc8' }}>
                      {boards.length} boards
                    </span>
                    {/* Workspace Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setWorkspaceMenuOpen(workspaceMenuOpen === workspace.id ? null : workspace.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                        style={{ color: '#b8bcc8' }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {workspaceMenuOpen === workspace.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setWorkspaceMenuOpen(null)}
                          />
                          <div
                            className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl z-20 py-2"
                            style={{
                              background: 'var(--surface-primary)',
                              backdropFilter: 'blur(20px)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <button
                              onClick={() => {
                                setEditingWorkspace({ id: workspace.id, name: workspace.name });
                                setWorkspaceMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-3"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Editar nome
                            </button>
                            <button
                              onClick={() => {
                                setWorkspaceMembersModal(workspace.id);
                                setWorkspaceMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-3"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              Gerenciar membros
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Tem certeza que deseja deletar este workspace? Todos os boards serão perdidos!')) {
                                  deleteWorkspaceMutation.mutate(workspace.id);
                                }
                                setWorkspaceMenuOpen(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 flex items-center gap-3"
                              style={{ color: '#ef4444' }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Deletar workspace
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Boards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {boards.slice(0, 4).map((board, boardIndex) => {
                      const isBoardFavorite = favoriteBoards.includes(board.id);
                      // Use board's backgroundColor if set, otherwise cycle through color palette
                      const boardBg = board.backgroundColor || boardColorClasses[boardIndex % boardColorClasses.length];

                      return (
                        <div key={board.id} className="relative" style={{ opacity: 0, animation: 'fadeInScale 0.4s ease-out forwards', animationDelay: `${boardIndex * 0.05}s` }}>
                          <Link
                            to={`/board/${board.id}`}
                            className="group block relative rounded-xl overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:shadow-2xl"
                            style={{
                              background: boardBg,
                              minHeight: '96px',
                              border: '1px solid rgba(102, 126, 234, 0.1)',
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40 group-hover:from-black/10 group-hover:to-black/30 transition-all duration-300" />
                            <div className="relative p-3 h-full flex flex-col justify-between">
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold text-white drop-shadow-lg flex-1">
                                  {board.name}
                                </div>
                                {/* Board Menu */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setBoardMenuOpen(boardMenuOpen === board.id ? null : board.id);
                                  }}
                                  className="w-6 h-6 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-white/20 z-20"
                                >
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </button>
                              </div>
                              <div className="text-xs text-white/70 mt-1 drop-shadow">
                                Atualizado recentemente
                              </div>
                            </div>

                            {/* Favorite Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavoriteBoard(board.id);
                              }}
                              className={`absolute bottom-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all z-10 ${
                                isBoardFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              } hover:scale-110`}
                              style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)',
                              }}
                            >
                              <svg
                                className="w-4 h-4"
                                fill={isBoardFavorite ? 'currentColor' : 'none'}
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                style={{ color: isBoardFavorite ? '#fbbf24' : 'white' }}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                          </Link>
                          {/* Board Menu Dropdown */}
                          {boardMenuOpen === board.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setBoardMenuOpen(null)}
                              />
                              <div
                                className="absolute right-0 top-8 z-20 w-48 rounded-xl shadow-2xl py-2"
                                style={{
                                  background: 'var(--surface-primary)',
                                  backdropFilter: 'blur(20px)',
                                  border: '1px solid var(--border-color)',
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setEditingBoard({ id: board.id, name: board.name, color: board.backgroundColor || boardBg });
                                    setBoardMenuOpen(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 flex items-center gap-3"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 flex items-center gap-3"
                                  style={{ color: '#ef4444' }}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="rounded-xl flex items-center justify-center transition-all duration-300 hover:translate-y-[-2px] cursor-pointer group"
                      style={{
                        background: 'rgba(45, 49, 66, 0.3)',
                        minHeight: '96px',
                        border: '2px dashed rgba(102, 126, 234, 0.3)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <div className="flex items-center gap-2" style={{ color: '#b8bcc8' }}>
                        <svg
                          className="w-5 h-5 transition-transform group-hover:rotate-90"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="font-semibold text-sm">Criar novo board</span>
                      </div>
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
        )}
      </div>
    </div>

      {showModal &&
        createPortal(
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
            onClick={() => setShowModal(false)}
          >
            <div
              className="rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slide-up mx-4"
              style={{
                background: 'var(--surface-primary)',
                backdropFilter: 'blur(10px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Criar Workspace
                </h3>
                <button
                  onClick={() => setShowModal(false)}
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

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-sm font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Nome do Workspace *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none"
                    style={{
                      background: 'var(--surface-secondary)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--border-color)',
                    }}
                    placeholder="Ex: Meu Projeto"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none resize-none"
                    style={{
                      background: 'var(--surface-secondary)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--border-color)',
                    }}
                    placeholder="Descreva o propósito deste workspace..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || !name.trim()}
                    className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
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

      {/* Create Board Modal */}
      {showCreateBoardModal &&
        createPortal(
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
            onClick={() => setShowCreateBoardModal(null)}
          >
            <div
              className="rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slide-up mx-4"
              style={{
                background: 'var(--surface-primary)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-color)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Criar Board
                </h3>
                <button
                  onClick={() => setShowCreateBoardModal(null)}
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
                className="space-y-5"
              >
                <div>
                  <label
                    className="block text-sm font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Nome do Board *
                  </label>
                  <input
                    type="text"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none"
                    style={{
                      background: 'var(--surface-secondary)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--border-color)',
                    }}
                    placeholder="Ex: Sprint Planning"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Cor do Board
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {['#667eea', '#f093fb', '#ffecd2', '#a8edea', '#fa709a', '#30cfd0'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBoardColor(color)}
                        className="w-12 h-12 rounded-lg transition-all hover:scale-110"
                        style={{
                          background: color,
                          border: boardColor === color ? '3px solid white' : 'none',
                          boxShadow: boardColor === color ? '0 0 0 2px var(--bg-gradient-start)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateBoardModal(null)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createBoardMutation.isPending || !boardName.trim()}
                    className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
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

      {/* Edit Board Modal */}
      {editingBoard &&
        createPortal(
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
            onClick={() => setEditingBoard(null)}
          >
            <div
              className="rounded-2xl p-8 max-w-md w-full shadow-2xl animate-slide-up mx-4"
              style={{
                background: 'var(--surface-primary)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-color)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Editar Board
                </h3>
                <button
                  onClick={() => setEditingBoard(null)}
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
                className="space-y-5"
              >
                <div>
                  <label
                    className="block text-sm font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Nome do Board *
                  </label>
                  <input
                    type="text"
                    value={editingBoard.name}
                    onChange={(e) => setEditingBoard({ ...editingBoard, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl focus:outline-none"
                    style={{
                      background: 'var(--surface-secondary)',
                      color: 'var(--text-primary)',
                      border: '2px solid var(--border-color)',
                    }}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold uppercase tracking-wide mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Cor do Board
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {['#667eea', '#f093fb', '#ffecd2', '#a8edea', '#fa709a', '#30cfd0'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditingBoard({ ...editingBoard, color })}
                        className="w-12 h-12 rounded-lg transition-all hover:scale-110"
                        style={{
                          background: color,
                          border: editingBoard.color === color ? '3px solid white' : 'none',
                          boxShadow: editingBoard.color === color ? '0 0 0 2px var(--bg-gradient-start)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingBoard(null)}
                    className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updateBoardMutation.isPending || !editingBoard.name.trim()}
                    className="flex-1 px-4 py-3 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
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
