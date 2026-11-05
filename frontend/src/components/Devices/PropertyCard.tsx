import React, { useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { formatPropertyName } from '../../utils/propertyFormatters';

interface PropertyCardProps {
  property: { property_name: string; property_value: string };
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const value = property.property_value;
  
  const isUrl = /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(value);
  const isHtml = /<[a-z][\s\S]*>/i.test(value.trim());

  const renderContent = () => {
    if (isUrl) {
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
        >
          {value}
        </a>
      );
    }

    if (isHtml) {
      return (
        <>
          {/* Tailwind's [&_x]: arbitrary-variant syntax is JIT-only and this
              project has no JIT — those classes never compiled. Real CSS,
              scoped to this wrapper, replaces them. */}
          <style>{`
            .prop-html-content a { color: #2563eb; }
            .prop-html-content a:hover { text-decoration: underline; }
            html.dark .prop-html-content a { color: #60a5fa; }
            .prop-html-content ul { list-style: disc; padding-left: 1.25rem; }
            .prop-html-content ol { list-style: decimal; padding-left: 1.25rem; }
            .prop-html-content p { margin-bottom: 0.5rem; }
            .prop-html-content h1 { font-size: 1.25rem; font-weight: 700; }
            .prop-html-content h2 { font-size: 1.125rem; font-weight: 700; }
          `}</style>
          <div
            className="prop-html-content text-gray-900 dark:text-white break-words"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </>
      );
    }

    return (
      <span className="text-gray-900 dark:text-white break-words font-semibold">
        {value}
      </span>
    );
  };

  // No card frame of its own: this sits inside an already-bordered accordion
  // panel or Paper, and giving every single property its own boxed card on
  // top of that produced three nested frames for one piece of information.
  return (
    <div className="min-w-0">
      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {formatPropertyName(property.property_name)}
      </h4>
      <div className="text-base">
        {renderContent()}
      </div>
    </div>
  );
};

export default PropertyCard;
