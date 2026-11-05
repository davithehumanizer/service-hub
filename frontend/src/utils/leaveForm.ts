import { History } from "history";

/** What a link to a form says when it is followed from the page it returns to. */
export type OpenedFrom = { fromPage?: boolean };

/**
 * Leaves a form for `target`, the page it was opened from. Pushing `target`
 * left the form behind it in the history, where that page's "back" button
 * then returned: to the form, not to the search before it. Going back to the
 * entry it came from, and making it `target` (a variant to show, say), leaves
 * the history as it was. Opened by its address, the form gives way to it.
 */
export const leaveForm = (history: History, target: string, openedFromPage: boolean) => {
  if (!openedFromPage) {
    history.replace(target);
    return;
  }
  const unlisten = history.listen((location) => {
    unlisten();
    if (location.pathname + location.search !== target) history.replace(target);
  });
  history.goBack();
};
