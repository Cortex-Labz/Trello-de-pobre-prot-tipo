import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { workspaceService } from '../../services/workspaceService';
import { boardService } from '../../services/boardService';
import CreateWorkspaceModal from '../CreateWorkspaceModal';

export default function Sidebar() {
  const { workspaceId, boardId } = useParams();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favoriteBoards');
    return saved ? JSON.parse(saved) : [];
  });
  const [recentBoards, setRecentBoards] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentBoards');
    return saved ? JSON.parse(saved) : [];
  });
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(() => {
    const saved = localStorage.getItem('quickActionsExpanded');
    return saved ? JSON.parse(saved) : false;
  });

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Save quick actions expanded state to localStorage
  useEffect(() => {
    localStorage.setItem('quickActionsExpanded', JSON.stringify(quickActionsExpanded));
  }, [quickActionsExpanded]);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('favoriteBoards', JSON.stringify(favorites));
  }, [favorites]);

  // Save recent boards to localStorage
  useEffect(() => {
    localStorage.setItem('recentBoards', JSON.stringify(recentBoards));
  }, [recentBoards]);

  // Track recent board access
  useEffect(() => {
    if (boardId && !recentBoards.includes(boardId)) {
      setRecentBoards(prev => [boardId, ...prev.filter(id => id !== boardId).slice(0, 9)]);
    }
  }, [boardId]);

  const toggleFavorite = (boardIdToToggle: string) => {
    setFavorites(prev =>
      prev.includes(boardIdToToggle)
        ? prev.filter(id => id !== boardIdToToggle)
        : [...prev, boardIdToToggle]
    );
  };

  // Fetch workspaces
  const { data: workspacesData } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspaceService.getWorkspaces(),
  });

  // Fetch current board to get its workspaceId
  const { data: currentBoardData } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoard(boardId!),
    enabled: !!boardId && !workspaceId,
  });

  // Get the actual workspaceId (either from params or from current board)
  const actualWorkspaceId = workspaceId || currentBoardData?.board?.workspaceId;

  // Fetch boards for current workspace
  const { data: boardsData } = useQuery({
    queryKey: ['boards', actualWorkspaceId],
    queryFn: () => boardService.getBoards(actualWorkspaceId!),
    enabled: !!actualWorkspaceId,
  });

  const workspaces = workspacesData?.workspaces || [];
  const boards = boardsData?.boards || [];

  //  Filter boards for favorites and recents
  const favoriteBoards = boards.filter(board => favorites.includes(board.id));
  const recentBoardsList = recentBoards
    .map(id => boards.find(board => board.id === id))
    .filter(Boolean)
    .slice(0, 5);

  return (
    <>
    <aside
      className={`h-full shadow-xl border-r transition-all duration-300 relative flex flex-col ${
        isCollapsed ? 'w-20' : 'w-80'
      }`}
      style={{
        background: 'rgba(26, 29, 41, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
        borderRight: '1px solid rgba(102, 126, 234, 0.15)',
        zIndex: 10,
      }}
    >
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
      {/* Navigation Menu */}
      <div className="p-4 border-b" style={{ borderColor: 'rgba(102, 126, 234, 0.08)' }}>
        <Link
          to="/dashboard"
          className={`flex items-center gap-3 p-3 rounded-xl transition-all mb-2 focus:outline-none ${
            isCollapsed ? 'justify-center' : 'hover:translate-x-1'
          }`}
          style={{
            background: !workspaceId
              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
              : 'transparent',
            color: !workspaceId ? 'var(--bg-gradient-start)' : 'var(--text-primary)',
            outline: 'none',
          }}
          title={isCollapsed ? 'Home - Todos os workspaces' : ''}
        >
          <svg
            className="w-6 h-6 flex-shrink-0 transition-transform group-hover:scale-110"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            style={{
              color: !workspaceId ? 'var(--bg-gradient-start)' : 'var(--text-secondary)',
              filter: !workspaceId ? `drop-shadow(0 0 8px var(--bg-gradient-start))` : 'none',
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          {!isCollapsed && (
            <div>
              <div className="font-semibold text-sm">Home</div>
              <div className="text-xs" style={{ color: '#b8bcc8' }}>Todos os workspaces</div>
            </div>
          )}
        </Link>
      </div>

      {/* Workspaces Section */}
      <div className="p-4">
        {!isCollapsed && (
          <div className="flex items-center justify-between mb-3">
            <div
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: '#b8bcc8' }}
            >
              Workspaces
            </div>
            <button
              onClick={() => setShowCreateWorkspace(true)}
              className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none"
              style={{
                background: 'rgba(37, 42, 61, 0.8)',
                color: '#b8bcc8',
                outline: 'none',
              }}
              title="Novo Workspace"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        )}

        <div className="space-y-2">
          {workspaces.map((workspace) => {
            const isActive = workspace.id === workspaceId;
            const firstLetter = workspace.name[0].toUpperCase();

            return (
              <Link
                key={workspace.id}
                to="/dashboard"
                className={`flex items-center gap-3 p-3 rounded-xl transition-all group focus:outline-none ${
                  isCollapsed ? 'justify-center' : 'hover:translate-x-1'
                }`}
                style={{
                  background: isActive
                    ? 'rgba(102, 126, 234, 0.15)'
                    : 'rgba(20, 22, 33, 0.4)',
                  border: isActive ? '1px solid rgba(102, 126, 234, 0.4)' : '1px solid rgba(102, 126, 234, 0.1)',
                  boxShadow: isActive
                    ? '0 4px 16px rgba(102, 126, 234, 0.25)'
                    : 'none',
                  outline: 'none',
                }}
                title={isCollapsed ? `${workspace.name} (${workspace._count?.boards || 0} boards)` : ''}
              >
                {isCollapsed ? (
                  <div
                    className="flex items-center justify-center flex-shrink-0 select-none no-transition"
                    style={{
                      width: '40px',
                      height: '40px',
                      fontSize: '16px',
                      fontWeight: '700',
                      lineHeight: '40px',
                      color: isActive ? '#667eea' : '#9ca3af',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      fontSmoothing: 'antialiased',
                      WebkitTextStroke: '0px',
                      outline: 'none',
                      textShadow: 'none',
                      letterSpacing: 'normal',
                    }}
                  >
                    {firstLetter}
                  </div>
                ) : (
                  <>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-all group-hover:scale-110 flex-shrink-0 no-transition"
                      style={{
                        background: 'rgba(102, 126, 234, 0.15)',
                        border: '1px solid rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      <svg className="w-5 h-5 no-transition" style={{ color: '#667eea' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 4 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate select-none no-transition" style={{
                        color: isActive ? '#ffffff' : '#ffffff',
                        WebkitFontSmoothing: 'antialiased',
                        textRendering: 'geometricPrecision',
                      }}>
                        {workspace.name}
                      </div>
                      <div
                        className="text-xs flex items-center gap-1.5 mt-0.5 no-transition"
                        style={{ color: isActive ? 'rgba(102, 126, 234, 0.9)' : '#9ca3af' }}
                      >
                        <svg className="w-3 h-3 no-transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {workspace._count?.boards || 0} boards
                      </div>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Section */}
      {!isCollapsed && actualWorkspaceId && (
        <>
          <div className="p-4 border-b" style={{ borderColor: 'rgba(102, 126, 234, 0.08)' }}>
            <button
              onClick={() => setQuickActionsExpanded(!quickActionsExpanded)}
              className="w-full flex items-center gap-2 mb-3 transition-all hover:opacity-70 focus:outline-none"
              style={{ outline: 'none' }}
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${quickActionsExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: '#b8bcc8' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <div
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: '#b8bcc8' }}
              >
                Ações Rápidas
              </div>
            </button>
            {quickActionsExpanded && (
              <div className="space-y-3">
              {/* Create Board Button */}
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-sm transition-all hover:translate-x-1 focus:outline-none"
                style={{
                  background: 'rgba(37, 42, 61, 0.8)',
                  color: '#ffffff',
                  outline: 'none',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                    color: 'white',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="font-medium">Criar Board</span>
              </button>

              {/* Favorites */}
              {favoriteBoards.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider px-1 flex items-center gap-2" style={{ color: '#b8bcc8' }}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    Favoritos
                  </div>
                  {favoriteBoards.map((board) => {
                    const isActive = board.id === boardId;
                    return (
                      <Link
                        key={board.id}
                        to={`/board/${board.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg text-sm transition-all group hover:translate-x-1 focus:outline-none"
                        style={{
                          background: isActive ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)' : 'transparent',
                          color: isActive ? 'var(--bg-gradient-start)' : 'var(--text-primary)',
                          fontWeight: isActive ? 600 : 500,
                          outline: 'none',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: board.backgroundColor || 'var(--surface-secondary)',
                          }}
                        >
                          <svg className="w-4 h-4" style={{ color: board.backgroundColor ? 'white' : 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                        </div>
                        <span className="truncate flex-1">{board.name}</span>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
                          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Recents */}
              {recentBoardsList.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider px-1 flex items-center gap-2" style={{ color: '#b8bcc8' }}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recentes
                  </div>
                  {recentBoardsList.map((board: any) => {
                    const isActive = board.id === boardId;
                    return (
                      <Link
                        key={board.id}
                        to={`/board/${board.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg text-sm transition-all group hover:translate-x-1 focus:outline-none"
                        style={{
                          background: isActive ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)' : 'transparent',
                          color: isActive ? 'var(--bg-gradient-start)' : 'var(--text-primary)',
                          fontWeight: isActive ? 600 : 500,
                          outline: 'none',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: board.backgroundColor || 'var(--surface-secondary)',
                          }}
                        >
                          <svg className="w-4 h-4" style={{ color: board.backgroundColor ? 'white' : 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                        </div>
                        <span className="truncate flex-1">{board.name}</span>
                        <svg
                          className="w-4 h-4"
                          fill={favorites.includes(board.id) ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: favorites.includes(board.id) ? '#f59e0b' : 'var(--text-secondary)' }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </Link>
                    );
                  })}
                </div>
              )}
              </div>
            )}
          </div>
        </>
      )}

      </div>

      {/* Toggle Button Fixed at Bottom Right */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg focus:outline-none"
        style={{
          background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
          color: 'white',
          zIndex: 20,
          outline: 'none',
        }}
        title={isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </aside>

    <CreateWorkspaceModal
      isOpen={showCreateWorkspace}
      onClose={() => setShowCreateWorkspace(false)}
    />
    </>
  );
}
