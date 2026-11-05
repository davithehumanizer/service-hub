import React from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentTextIcon, VideoCameraIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface MultimediaItem {
  URL: string;
  Type: string;
  Description: string;
  ContentType: string;
  IsVideo: number;
}

interface MultimediaViewerProps {
  multimediaJson: string; // JSON.stringify(j.data.Multimedia)
}

const MultimediaViewer: React.FC<MultimediaViewerProps> = ({ multimediaJson }) => {
  const { t } = useTranslation();
  let items: MultimediaItem[] = [];
  
  try {
    items = JSON.parse(multimediaJson);
    if (!Array.isArray(items)) {
      items = [];
    }
  } catch (error) {
    console.error('Failed to parse multimedia JSON:', error);
    return <p className="text-red-500">{t('devicesComponent.multimediaError')}</p>;
  }
  
  if (items.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">{t('devicesComponent.noMultimedia')}</p>;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <div 
          key={index} 
          className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow duration-200"
        >
          <div className="flex items-center mb-3">
            {item.IsVideo ? (
              <VideoCameraIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            ) : (
              <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            )}
            <span className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
              {item.Type}
            </span>
          </div>
          
          {item.Description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
              {item.Description}
            </p>
          )}
          
          <a 
            href={item.URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
          >
            View {item.Type}
            <ArrowTopRightOnSquareIcon className="w-4 h-4 ml-1" />
          </a>
          
          {item.ContentType && (
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {item.ContentType}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default MultimediaViewer;
