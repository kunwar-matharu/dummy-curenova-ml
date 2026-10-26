import React, { useState } from 'react';

export default function Tooltip({
  children,
  content,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  className = ''
}) {
  const [visible, setVisible] = useState(false);

  if (!content) return children;

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 px-2.5 py-1.5 text-[11px] font-medium text-white bg-[#0b132b] dark:bg-[#1e293b] border border-[#334155] rounded-md shadow-lg pointer-events-none whitespace-nowrap transition-opacity duration-150 animate-in fade-in-0 zoom-in-95 ${
            positionStyles[position] || positionStyles.top
          }`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
