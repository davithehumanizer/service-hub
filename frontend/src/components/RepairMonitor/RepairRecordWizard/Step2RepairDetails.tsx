import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, Textarea, NumberInput } from '@mantine/core';

interface Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

const Step2RepairDetails: React.FC<Props> = ({ data, onChange }) => {
  const { t } = useTranslation();

  const PROBLEM_TAGS = [
    { value: 'MECHANICAL', label: t('repairMonitor.step2.problemTags.MECHANICAL') },
    { value: 'POWER_ELECTRICAL', label: t('repairMonitor.step2.problemTags.POWER_ELECTRICAL') },
    { value: 'BEHAVIOUR_SYMPTOM', label: t('repairMonitor.step2.problemTags.BEHAVIOUR_SYMPTOM') },
    { value: 'MAINTENANCE', label: t('repairMonitor.step2.problemTags.MAINTENANCE') },
    { value: 'SOFTWARE', label: t('repairMonitor.step2.problemTags.SOFTWARE') },
    { value: 'USER_RELATED', label: t('repairMonitor.step2.problemTags.USER_RELATED') },
    { value: 'BATTERY', label: t('repairMonitor.step2.problemTags.BATTERY') },
    { value: 'CONTROL_ELECTRONIC', label: t('repairMonitor.step2.problemTags.CONTROL_ELECTRONIC') },
    { value: 'NONE_OTHER', label: t('repairMonitor.step2.problemTags.NONE_OTHER') },
  ];

  const SOLUTION_TAGS = [
    { value: 'PartReplacement', label: t('repairMonitor.step2.solutionTags.PartReplacement') },
    { value: 'Cleaning', label: t('repairMonitor.step2.solutionTags.Cleaning') },
    { value: 'Soldering', label: t('repairMonitor.step2.solutionTags.Soldering') },
    { value: 'SoftwareUpdate', label: t('repairMonitor.step2.solutionTags.SoftwareUpdate') },
    { value: 'Rewiring', label: t('repairMonitor.step2.solutionTags.Rewiring') },
    { value: 'Adjustment', label: t('repairMonitor.step2.solutionTags.Adjustment') },
    { value: 'Sewing', label: t('repairMonitor.step2.solutionTags.Sewing') },
    { value: 'Lubrication', label: t('repairMonitor.step2.solutionTags.Lubrication') },
    { value: 'Other', label: t('repairMonitor.step2.solutionTags.Other') },
  ];

  return (
    <div className="space-y-8">

      {/* Problem */}
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-red-500">bug_report</span>
          {t('repairMonitor.step2.problemTitle')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {t('repairMonitor.step2.problemDesc')}
        </p>
        <div className="space-y-4">
          <Textarea
            label={t('repairMonitor.step2.problemLabel')}
            placeholder={t('repairMonitor.step2.problemPlaceholder')}
            rows={3}
            value={data.problem || ''}
            onChange={(e) => onChange({ problem: e.currentTarget.value })}
          />
          <Select
            label={t('repairMonitor.step2.problemTag')}
            placeholder={t('repairMonitor.step2.selectTag')}
            data={PROBLEM_TAGS}
            value={data.problemTag || null}
            onChange={(v) => onChange({ problemTag: v || '' })}
            clearable
          />
        </div>
      </div>

      {/* Solution */}
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center text-gray-900 dark:text-white">
          <span className="material-symbols-outlined mr-2 text-teal-600 dark:text-teal-400">build</span>
          {t('repairMonitor.step2.solutionTitle')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {t('repairMonitor.step2.solutionDesc')}
        </p>
        <div className="space-y-4">
          <Textarea
            label={t('repairMonitor.step2.solutionLabel')}
            placeholder={t('repairMonitor.step2.solutionPlaceholder')}
            rows={3}
            value={data.repairSolution || ''}
            onChange={(e) => onChange({ repairSolution: e.currentTarget.value })}
          />
          <Select
            label={t('repairMonitor.step2.solutionTag')}
            placeholder={t('repairMonitor.step2.selectTag')}
            data={SOLUTION_TAGS}
            value={data.solutionTag || null}
            onChange={(v) => onChange({ solutionTag: v || '' })}
            clearable
          />
          <NumberInput
            label={t('repairMonitor.step2.feasibility')}
            description={t('repairMonitor.step2.feasibilityDesc')}
            placeholder={t('repairMonitor.step2.feasibilityPlaceholder')}
            value={data.repairFeasibility ?? ''}
            onChange={(v) => onChange({ repairFeasibility: v || undefined })}
            min={0}
            max={10}
            step={0.5}
          />
          <Textarea
            label={t('repairMonitor.step2.notes')}
            placeholder={t('repairMonitor.step2.notesPlaceholder')}
            rows={2}
            value={data.repairExplanation || ''}
            onChange={(e) => onChange({ repairExplanation: e.currentTarget.value })}
          />
        </div>
      </div>
    </div>
  );
};

export default Step2RepairDetails;
