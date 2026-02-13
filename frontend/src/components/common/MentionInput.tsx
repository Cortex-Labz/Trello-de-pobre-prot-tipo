import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface User {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  users: User[];
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
}

export default function MentionInput({
  value,
  onChange,
  placeholder = 'Escreva um comentário...',
  rows = 3,
  users,
  onKeyDown,
  className = '',
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filtrar usuários baseado no texto após @
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(suggestionFilter.toLowerCase())
  );

  // Detectar quando o usuário digita @ e mostrar sugestões
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    onChange(newValue);
    setCursorPosition(cursorPos);

    // Procurar por @ antes do cursor
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1);

      // Verificar se há espaço ou nova linha após o @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setSuggestionFilter(textAfterAt);
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }

    setShowSuggestions(false);
  };

  // Inserir menção selecionada
  const insertMention = (userName: string) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol !== -1) {
      const newValue =
        value.slice(0, lastAtSymbol) +
        `@${userName} ` +
        textAfterCursor;

      onChange(newValue);

      // Posicionar cursor após a menção
      setTimeout(() => {
        const newCursorPos = lastAtSymbol + userName.length + 2;
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current?.focus();
      }, 0);
    }

    setShowSuggestions(false);
  };

  // Navegação por teclado
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex].name);
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // Chamar onKeyDown original se fornecido
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Scroll automático para item selecionado
  useEffect(() => {
    if (suggestionsRef.current && showSuggestions) {
      const selectedElement = suggestionsRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, showSuggestions]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {/* Dropdown de sugestões */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full max-w-xs mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => insertMention(user.name)}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mensagem informativa quando não há resultados */}
      {showSuggestions && filteredUsers.length === 0 && suggestionFilter && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full max-w-xs mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-3"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhum usuário encontrado com "{suggestionFilter}"
          </p>
        </div>
      )}
    </div>
  );
}
