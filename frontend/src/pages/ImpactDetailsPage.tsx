import React from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageTitle from '../components/Typography/PageTitle';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../stores/globalStore';
import { WizardImpactDisplay } from '../components/Wizard/WizardImpactDisplay';
import { setStep } from '../stores/repairWorkflowSlice';

const ImpactDetailsPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();
  const { wizardDevice } = useSelector((state: RootState) => state.repairWorkflow);
  const fromWizardStep = (location.state as { fromWizardStep?: number })?.fromWizardStep;

  const handleReturnToWizard = () => {
    if (fromWizardStep !== undefined) {
      dispatch(setStep(fromWizardStep));
      history.push('/app/wizard');
    } else {
      // Fallback if no step is provided, go to the beginning of the wizard
      history.push('/app/wizard');
    }
  };

  return (
    <>
      <PageTitle>{t('impactDetails.title')}</PageTitle>
      <div className="px-4 py-3 mb-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        {wizardDevice ? (
          <WizardImpactDisplay device={wizardDevice} />
        ) : (
          <p>{t('impactDetails.noDevice')}</p>
        )}
      </div>
      {fromWizardStep !== undefined && (
        <div className="mt-4">
          <button
            onClick={handleReturnToWizard}
            className="group relative flex justify-center rounded-full border border-transparent bg-customgreen-500 py-3 px-4 text-sm font-bold text-white hover:bg-customgreen-600 focus:outline-none focus:ring-2 focus:ring-customgreen-500 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800 transition-colors"
          >
            {t('impactDetails.returnToWizard')}
          </button>
        </div>
      )}
    </>
  );
};

export default ImpactDetailsPage;