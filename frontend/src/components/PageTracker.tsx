import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetry } from '../services/telemetry.service';

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Log page view whenever location changes
    telemetry.logAction('page_view', {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
    });
  }, [location]);

  return null;
};

export default PageTracker;
