import React, { useState, useCallback, createContext, useContext } from 'react';
import SurveyWidget, { SurveyConfig } from '../components/Survey/SurveyWidget';
import api from '../services/api';

interface SurveyContextValue {
  triggerSurvey: (triggerKey: string) => void;
  closeSurvey: () => void;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

export const useSurvey = () => {
  const context = useContext(SurveyContext);
  if (!context) {
    throw new Error('useSurvey must be used within a SurveyProvider');
  }
  return context;
};

interface SurveyProviderProps {
  children: React.ReactNode;
}

export const SurveyProvider: React.FC<SurveyProviderProps> = ({ children }) => {
  const [survey, setSurvey] = useState<SurveyConfig | null>(null);

  const triggerSurvey = useCallback(async (triggerKey: string) => {
    // Check if already dismissed in this session
    const dismissedKey = `survey_dismissed_${triggerKey}`;
    if (sessionStorage.getItem(dismissedKey)) {
      return;
    }
    // Loaded before anything is shown: with no survey in the database (404)
    // or one without questions, there is no popup at all, not an empty one.
    try {
      const response = await api.get(`v1/surveys/trigger/${triggerKey}`);
      if (response.data?.questions?.length) {
        setSurvey(response.data);
      }
    } catch {
      // No survey for this trigger.
    }
  }, []);

  const closeSurvey = useCallback(() => {
    if (survey) {
      sessionStorage.setItem(`survey_dismissed_${survey.triggerKey}`, 'true');
    }
    setSurvey(null);
  }, [survey]);

  const handleComplete = useCallback(() => {
    setTimeout(() => {
      closeSurvey();
    }, 3000);
  }, [closeSurvey]);

  return (
    <SurveyContext.Provider value={{ triggerSurvey, closeSurvey }}>
      {children}
      
      {/* Popup Modal */}
      {survey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeSurvey}
          />
          
          {/* Modal Content */}
          <div className="relative z-10 max-w-md w-full mx-4 animate-fade-in">
            {/* Close button */}
            <button
              onClick={closeSurvey}
              className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors z-20"
              aria-label="Close survey"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <SurveyWidget 
              config={survey} 
              onComplete={handleComplete}
              className="shadow-2xl"
            />
          </div>
        </div>
      )}
    </SurveyContext.Provider>
  );
};

export default SurveyProvider;
