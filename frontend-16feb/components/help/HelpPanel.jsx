import React, { useState } from 'react';
import { X, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const HelpPanel = ({ isOpen, onClose, content = {}, title = "Help" }) => {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (key) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-transparent z-40"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col">

        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6" />
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-700 rounded p-1 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {content.pageTitle && (
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {content.pageTitle.title}
              </h3>
              <p className="text-gray-600">
                {content.pageTitle.description}
              </p>
            </div>
          )}

          {Object.entries(content).map(([key, value]) => {
            if (key === 'pageTitle') return null;

            if (typeof value === 'object' && !value.title) {
              return (
                <div key={key} className="space-y-2">
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  {Object.entries(value).map(([subKey, subValue]) => (
                    <div key={subKey} className="pl-4 border-l-2 border-gray-200 py-2">
                      <p className="text-sm text-gray-600">{subValue}</p>
                    </div>
                  ))}
                </div>
              );
            }

            const isExpanded = expandedSections[key] !== false;

            return (
              <div key={key} className="border-b border-gray-200 pb-4">
                <button
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {value.title || key}
                  </h4>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-3 text-gray-600 space-y-2">
                    <p>{value.content || value.description || value}</p>
                  </div>
                )}
              </div>
            );
          })}

        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </>
  );
};

export const HelpButton = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors ${className}`}
      title="Open help panel"
    >
      <HelpCircle className="w-5 h-5" />
      <span>Help</span>
    </button>
  );
};

export default HelpPanel;
