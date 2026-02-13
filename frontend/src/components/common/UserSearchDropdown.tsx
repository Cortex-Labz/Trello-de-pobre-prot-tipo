import { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { userService } from '../../services/userService';

interface UserSearchDropdownProps {
  onSelectUser: (user: User) => void;
  excludeUserIds?: string[];
  placeholder?: string;
}

export default function UserSearchDropdown({
  onSelectUser,
  excludeUserIds = [],
  placeholder = 'Buscar por email ou nome...',
}: UserSearchDropdownProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const delayTimer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const result = await userService.searchUsers(query.trim());
          // Filter out excluded users
          const filteredUsers = result.users.filter(
            (user) => !excludeUserIds.includes(user.id)
          );
          setUsers(filteredUsers);
          setIsOpen(true);
        } catch (error) {
          console.error('Error searching users:', error);
          setUsers([]);
        } finally {
          setLoading(false);
        }
      } else {
        setUsers([]);
        setIsOpen(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayTimer);
  }, [query, excludeUserIds]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
    setQuery('');
    setUsers([]);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {isOpen && users.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(user.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && query.trim().length >= 2 && users.length === 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Nenhum usuário encontrado
          </p>
        </div>
      )}
    </div>
  );
}
