import React, { useState } from 'react';
import { HelpCircle, Info, AlertCircle } from 'lucide-react';

const Tooltip = ({ 
  content, 
  children = null, 
  icon = false,
  iconType = 'help',
  position = 'top',
  maxWidth = '300px',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const IconComponent = iconType === 'help' ? HelpCircle :
                       iconType === 'info' ? Info :
                       AlertCircle;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-t-8 border-x-transparent border-x-8 border-b-0',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-b-8 border-x-transparent border-x-8 border-t-0',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-l-8 border-y-transparent border-y-8 border-r-0',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-r-8 border-y-transparent border-y-8 border-l-0'
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {icon ? (
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onFocus={() => setIsVisible(true)}
          onBlur={() => setIsVisible(false)}
        >
          <IconComponent className="w-4 h-4" />
        </button>
      ) : (
        <div
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          {children}
        </div>
      )}

      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`} style={{ maxWidth }}>
          <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg">
            {content}
          </div>
          <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
