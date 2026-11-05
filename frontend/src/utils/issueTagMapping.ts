export interface IssueTagInfo {
  /** i18n key; callers resolve it with t() so the badge follows the locale. */
  displayKey: string;
  /** The same, as a sentence a non-professional can read. */
  sentenceKey: string;
  icon: string;
  badgeClasses: string;
}

const ISSUE_TAG_MAP: Record<string, IssueTagInfo> = {
  MECHANICAL: {
    displayKey: "issueTag.MECHANICAL",
    sentenceKey: "issueTag.likely.MECHANICAL",
    icon: "build",
    badgeClasses:
      "text-orange-700 bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-600 dark:text-orange-300",
  },
  POWER_ELECTRICAL: {
    displayKey: "issueTag.POWER_ELECTRICAL",
    sentenceKey: "issueTag.likely.POWER_ELECTRICAL",
    icon: "bolt",
    badgeClasses:
      "text-yellow-700 bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300",
  },
  BEHAVIOUR_SYMPTOM: {
    displayKey: "issueTag.BEHAVIOUR_SYMPTOM",
    sentenceKey: "issueTag.likely.BEHAVIOUR_SYMPTOM",
    icon: "psychology",
    badgeClasses:
      "text-blue-700 bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300",
  },
  MAINTENANCE: {
    displayKey: "issueTag.MAINTENANCE",
    sentenceKey: "issueTag.likely.MAINTENANCE",
    icon: "handyman",
    badgeClasses:
      "text-gray-600 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300",
  },
  SOFTWARE: {
    displayKey: "issueTag.SOFTWARE",
    sentenceKey: "issueTag.likely.SOFTWARE",
    icon: "code",
    badgeClasses:
      "text-purple-700 bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300",
  },
  USER_RELATED: {
    displayKey: "issueTag.USER_RELATED",
    sentenceKey: "issueTag.likely.USER_RELATED",
    icon: "person",
    badgeClasses:
      "text-teal-700 bg-teal-100 border-teal-300 dark:bg-teal-900/30 dark:border-teal-600 dark:text-teal-300",
  },
  BATTERY: {
    displayKey: "issueTag.BATTERY",
    sentenceKey: "issueTag.likely.BATTERY",
    icon: "battery_charging_full",
    badgeClasses:
      "text-green-700 bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300",
  },
  CONTROL_ELECTRONIC: {
    displayKey: "issueTag.CONTROL_ELECTRONIC",
    sentenceKey: "issueTag.likely.CONTROL_ELECTRONIC",
    icon: "memory",
    badgeClasses:
      "text-indigo-700 bg-indigo-100 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-300",
  },
  NONE_OTHER: {
    displayKey: "issueTag.NONE_OTHER",
    sentenceKey: "issueTag.likely.NONE_OTHER",
    icon: "help_outline",
    badgeClasses:
      "text-gray-500 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-400",
  },
};

const FALLBACK: IssueTagInfo = {
  displayKey: "issueTag.UNKNOWN",
  sentenceKey: "issueTag.likely.UNKNOWN",
  icon: "help_outline",
  badgeClasses:
    "text-gray-500 bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-400",
};

export function getIssueTagInfo(label: string): IssueTagInfo {
  return ISSUE_TAG_MAP[label] ?? FALLBACK;
}
