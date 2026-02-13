import React from 'react';

// URL regex pattern that matches most common URL formats
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;

/**
 * Converts URLs in text to clickable links
 * @param text - The text containing potential URLs
 * @returns JSX with clickable links
 */
export function linkify(text: string): React.ReactNode {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  text.replace(URL_REGEX, (match, ...args) => {
    const offset = args[args.length - 2]; // offset is second to last argument

    // Add text before the URL
    if (offset > lastIndex) {
      parts.push(text.substring(lastIndex, offset));
    }

    // Normalize the URL - add https:// if not present
    let url = match;
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }

    // Add the clickable link
    parts.push(
      <a
        key={offset}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {match}
      </a>
    );

    lastIndex = offset + match.length;
    return match;
  });

  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Renders text with clickable links, preserving line breaks
 * @param text - The text to render
 * @returns JSX with links and preserved line breaks
 */
export function renderTextWithLinks(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lineIndex) => (
    <React.Fragment key={lineIndex}>
      {linkify(line)}
      {lineIndex < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}
