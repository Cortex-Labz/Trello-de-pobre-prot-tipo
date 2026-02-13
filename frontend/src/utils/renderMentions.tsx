import React from 'react';

/**
 * Renderiza texto com menções destacadas visualmente
 * Converte @username em elementos estilizados
 */
export function renderTextWithMentions(text: string): React.ReactNode {
  if (!text) return null;

  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const [fullMatch, username] = match;
    const matchIndex = match.index;

    // Adicionar texto antes da menção
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    // Adicionar menção estilizada
    parts.push(
      <span
        key={`mention-${matchIndex}`}
        className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
        title={`@${username}`}
      >
        @{username}
      </span>
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  // Adicionar texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

/**
 * Versão combinada que renderiza tanto links quanto menções
 * Pode ser usado no lugar de renderTextWithLinks quando menções estiverem presentes
 */
export function renderTextWithLinksAndMentions(text: string): React.ReactNode {
  if (!text) return null;

  // Primeiro, processar menções
  const mentionRegex = /@(\w+)/g;
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Criar array de tokens (texto, menção, ou link)
  const tokens: Array<{
    type: 'text' | 'mention' | 'link';
    content: string;
    index: number;
  }> = [];

  // Encontrar todas as menções
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    tokens.push({
      type: 'mention',
      content: match[1], // username sem @
      index: match.index,
    });
  }

  // Encontrar todos os links
  while ((match = urlRegex.exec(text)) !== null) {
    tokens.push({
      type: 'link',
      content: match[0],
      index: match.index,
    });
  }

  // Ordenar tokens por posição
  tokens.sort((a, b) => a.index - b.index);

  // Se não houver tokens especiais, retornar texto normal
  if (tokens.length === 0) {
    return text;
  }

  // Construir resultado
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  tokens.forEach((token, idx) => {
    // Adicionar texto antes do token
    if (token.index > lastIndex) {
      parts.push(text.slice(lastIndex, token.index));
    }

    // Adicionar token estilizado
    if (token.type === 'mention') {
      parts.push(
        <span
          key={`mention-${idx}`}
          className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
          title={`@${token.content}`}
        >
          @{token.content}
        </span>
      );
      lastIndex = token.index + token.content.length + 1; // +1 para o @
    } else if (token.type === 'link') {
      parts.push(
        <a
          key={`link-${idx}`}
          href={token.content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {token.content}
        </a>
      );
      lastIndex = token.index + token.content.length;
    }
  });

  // Adicionar texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
