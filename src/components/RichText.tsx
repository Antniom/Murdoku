import React from 'react';

/**
 * Safely renders inline **bold** segments in clue pills, twist banners, and proof steps.
 */
export const RichText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </>
  );
};
