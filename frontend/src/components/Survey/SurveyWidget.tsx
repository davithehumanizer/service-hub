import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { telemetry } from '../../services/telemetry.service';

interface Question {
  id: string;
  type: 'rating' | 'text' | 'boolean';
  text: string;
  options?: string[];
}

export interface SurveyConfig {
  id: string;
  title: string;
  triggerKey: string;
  questions: Question[];
}

interface SurveyWidgetProps {
  config: SurveyConfig;
  onComplete?: () => void;
  className?: string; // For custom styling
}

// Given a loaded survey with at least one question: the provider fetches it
// before opening the popup, so an absent survey never shows an empty frame.
const SurveyWidget: React.FC<SurveyWidgetProps> = ({ config, onComplete, className }) => {
  const { t } = useTranslation();
  const { triggerKey } = config;
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [visible, setVisible] = useState(true);

  const handleAnswer = (value: any) => {
    const question = config.questions[currentStep];
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    if (currentStep < config.questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitSurvey(newAnswers);
    }
  };

  const submitSurvey = async (finalAnswers: any) => {
    try {
      await api.post(`v1/surveys/${triggerKey}/response`, {
        answers: finalAnswers,
      });
      telemetry.logAction('survey_submitted', { triggerKey });
      setSubmitted(true);
      if (onComplete) onComplete();
      
      // Auto close after 3 seconds
      setTimeout(() => setVisible(false), 3000);
    } catch (error) {
      console.error('Failed to submit survey', error);
      telemetry.logAction('survey_submit_failed', { triggerKey, error: String(error) });
    }
  };

  if (!visible) return null;

  if (submitted) {
    return (
      <div className={`p-4 bg-white rounded-lg shadow-md border border-green-100 ${className}`}>
        <p className="text-green-600 font-medium text-center">{t('survey.thankYou')}</p>
      </div>
    );
  }

  const question = config.questions[currentStep];

  return (
    <div className={`p-4 bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{config.title}</h3>
        <p className="text-sm text-gray-500 mb-2">
          {t('survey.questionOf', { current: currentStep + 1, total: config.questions.length })}
        </p>
        <p className="text-gray-700 font-medium mb-3">{question.text}</p>
        
        <div className="flex gap-2 flex-wrap">
          {question.type === 'rating' && (
             <div className="flex justify-between w-full mt-2 space-x-1">
               {[
                 { val: 1, label: t('survey.ratingVeryDissatisfied'), icon: 'sentiment_very_dissatisfied', color: 'text-red-600' },
                 { val: 2, label: t('survey.ratingDissatisfied'), icon: 'sentiment_dissatisfied', color: 'text-orange-500' },
                 { val: 3, label: t('survey.ratingNeutral'), icon: 'sentiment_neutral', color: 'text-yellow-500' },
                 { val: 4, label: t('survey.ratingSatisfied'), icon: 'sentiment_satisfied', color: 'text-green-500' },
                 { val: 5, label: t('survey.ratingVerySatisfied'), icon: 'sentiment_very_satisfied', color: 'text-green-600' },
               ].map((item) => (
                 <button
                   key={item.val}
                   onClick={() => handleAnswer(item.val)}
                   title={item.label}
                   className="flex flex-col items-center flex-1 group focus:outline-none"
                 >
                   <span className={`material-symbols-outlined text-4xl sm:text-5xl transition-all transform group-hover:scale-110 duration-200 cursor-pointer ${item.color} opacity-60 group-hover:opacity-100`}>
                     {item.icon}
                   </span>
                   <span className="text-xxs mt-2 text-gray-400 group-hover:text-gray-700 font-medium transition-colors hidden sm:block">
                     {item.label}
                   </span>
                 </button>
               ))}
             </div>
          )}

          {question.type === 'boolean' && (
            <>
              <button
                 onClick={() => handleAnswer(true)}
                 className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition"
              >
                {t('common.yes')}
              </button>
              <button
                 onClick={() => handleAnswer(false)}
                 className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition"
              >
                {t('common.no')}
              </button>
            </>
          )}

          {question.type === 'text' && (
            <div className="w-full">
              <textarea
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                onBlur={(e) => handleAnswer(e.target.value)}
                placeholder={t('survey.textPlaceholder')}
              />
              <button
                onClick={() => { /* Logic to handle text "Next" explicitly if needed, but onBlur might suffice for simple flow */ }}
                className="mt-2 text-sm text-blue-600 underline"
              >
                {t('survey.skipNext')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyWidget;
