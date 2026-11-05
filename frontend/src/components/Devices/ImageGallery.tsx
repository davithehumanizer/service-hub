import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatImageName } from '../../utils/propertyFormatters';

interface ImageGalleryProps {
  images: Array<{ name: string; url: string }>;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  if (images.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">{t('devicesComponent.noPhotos')}</p>;
  }
  
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img, index) => (
          <div 
            key={index}
            className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg"
            onClick={() => setSelectedImage(img.url)}
          >
            <img 
              src={img.url} 
              alt={formatImageName(img.name)}
              className="w-full h-full object-cover shadow hover:shadow-xl transition-all duration-200 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
              <MagnifyingGlassPlusIcon className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}
            >
              <p className="text-xs text-white font-medium text-center">
                {formatImageName(img.name)}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            aria-label={t('devicesComponent.closeLightbox')}
          >
            <XMarkIcon className="w-8 h-8" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ImageGallery;
