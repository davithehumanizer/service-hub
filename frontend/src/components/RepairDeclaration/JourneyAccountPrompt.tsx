import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { RootState } from '../../stores/globalStore';
import { dismissAccountPrompt } from '../../stores/repairWorkflowSlice';
import { returnToSearch } from '../../utils/returnTo';

/**
 * Where signing in lands: the page listing the journeys just adopted.
 *
 * Not back to the summary — signing in resets `repairWorkflow`, so returning
 * to the wizard would show step 0. This shows what the account just kept.
 */
const RETURN_TO = '/app/my-repairs';

/**
 * Invites a guest to keep the journey they have just finished.
 *
 * Deliberately non-blocking and secondary to the recommendation above it:
 * nothing here is required, the journey is already recorded and can be declared
 * from this browser without an account. An account only makes it portable.
 */
const JourneyAccountPrompt: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { journeyId, journeyModelId, journeyDeviceName, accountPromptDismissed } = useSelector(
    (state: RootState) => state.repairWorkflow,
  );
  // A device typed in by hand: an account is what keeps it, among one's devices.
  const unlisted = journeyModelId == null && journeyDeviceName;

  // Nothing to keep until the journey exists, and nothing to offer someone who
  // is already signed in.
  if (user || !journeyId || accountPromptDismissed) return null;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-base text-customgreen-500 mt-0.5">
          bookmark_added
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            {unlisted
              ? t('journeyPrompt.savedUnlisted', { name: journeyDeviceName })
              : t('journeyPrompt.saved')}
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <Link
              to={`/create-account${returnToSearch(RETURN_TO)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-customgreen-500 hover:bg-customgreen-600 text-white text-sm font-semibold py-2 px-4 transition-colors"
            >
              {t('journeyPrompt.createAccount')}
            </Link>
            <Link
              to={`/login${returnToSearch(RETURN_TO)}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-customgreen-700 dark:text-customgreen-300 hover:underline py-2"
            >
              {t('journeyPrompt.signIn')}
            </Link>
            <button
              type="button"
              onClick={() => dispatch(dismissAccountPrompt())}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:underline py-2"
            >
              {t('journeyPrompt.later')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyAccountPrompt;
