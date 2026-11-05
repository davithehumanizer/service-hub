import React, { ReactElement, useState } from 'react';

interface DeviceImageProps {
  /** Candidate pictures, best first — see `deviceImageUrls`. */
  urls: string[];
  alt: string;
  className?: string;
  /** Wraps the picture only — the fallback keeps its own layout. */
  wrapperClassName?: string;
  /** Rendered once every candidate has failed. */
  fallback: ReactElement;
}

/**
 * A device picture that falls back instead of breaking. Icecat serves 404 for
 * pictures it still advertises in its API, and the browser then paints the alt
 * text inside the frame. Each failure moves on to the next candidate, and the
 * fallback shows when none of them loads.
 */
const DeviceImage: React.FC<DeviceImageProps> = ({ urls, alt, className, wrapperClassName, fallback }) => {
  const [failed, setFailed] = useState<string[]>([]);

  // Tracking the URLs rather than an index keeps this correct when the card is
  // reused for another device as the list scrolls or filters.
  const url = urls.find((candidate) => !failed.includes(candidate));

  if (!url) {
    return fallback;
  }

  const image = (
    <img
      key={url}
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed((current) => [...current, url])}
    />
  );

  return wrapperClassName ? <div className={wrapperClassName}>{image}</div> : image;
};

export default DeviceImage;
