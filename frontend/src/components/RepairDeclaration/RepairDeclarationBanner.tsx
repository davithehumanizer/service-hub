import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../stores/globalStore';
import {
  dismissPendingDeclaration,
  isDueForDeclaration,
  markDeclarationDone,
  snoozePendingDeclaration,
} from '../../stores/pendingDeclarationsSlice';
import RepairDeclarationForm from './RepairDeclarationForm';

/**
 * Asks whether a repair that was planned days ago actually worked, and turns
 * the answer into the platform's only self-declared statistics.
 *
 * Reads the journeys this browser recorded, so it works for guests — which is
 * most people. Nothing is sent until an outcome is picked: "not yet" only
 * pushes the local reminder back.
 */
const RepairDeclarationBanner: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const items = useSelector(
    (state: RootState) => state.pendingDeclarations.items,
  );

  const [declared, setDeclared] = useState(false);

  // Oldest first: the one most likely to have an answer by now.
  const due = useMemo(
    () => items.filter((item) => isDueForDeclaration(item))[0],
    [items],
  );

  const shell = (children: React.ReactNode) => (
    <div className="mb-6 rounded-2xl border border-customgreen-500 bg-customgreen-50 dark:bg-customgreen-900/20 p-4">
      {children}
    </div>
  );

  // Checked before `due`, which the successful submit has just removed from the
  // store: otherwise the banner vanishes without ever thanking anyone.
  if (declared) {
    return shell(
      <p className="flex items-center gap-2 text-sm font-medium text-customgreen-700 dark:text-customgreen-300">
        <span className="material-symbols-outlined text-base">check_circle</span>
        {t('declaration.thanks')}
      </p>,
    );
  }

  // Not over a journey being made: it asked about the last one while the
  // visitor was starting the next (PBI 13840). The dashboard hosts the wizard.
  if (!due || /^\/app\/(wizard|dashboard)\b/.test(pathname)) return null;

  const deviceLabel =
    [due.brand, due.modelType].filter(Boolean).join(' ') ||
    t('declaration.yourDevice');

  return shell(
    <RepairDeclarationForm
      journeyId={due.journeyId}
      declarationToken={due.declarationToken}
      deviceLabel={deviceLabel}
      // One reminder only: once snoozed, the second ask has no "not yet".
      onSnooze={due.snoozed ? undefined : () => dispatch(snoozePendingDeclaration(due.journeyId))}
      onDismiss={() => dispatch(dismissPendingDeclaration(due.journeyId))}
      onDeclared={() => {
        setDeclared(true);
        dispatch(markDeclarationDone(due.journeyId));
      }}
    />,
  );
};

export default RepairDeclarationBanner;
