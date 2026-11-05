/**
 * Windmill swaps the theme by rewriting the class of <html> (it clears className
 * entirely, then re-adds 'light' or 'dark'). Every element that combines a
 * `transition-*` utility with `dark:` variants restarts its colour transition on
 * that swap and ends up stuck on the previous theme's colours.
 *
 * Turning transitions off for the duration of the swap makes the change instant
 * and correct, while keeping hover transitions everywhere else. The marker class
 * goes on <body> because Windmill wipes the one on <html>.
 */
const MARKER = 'theme-switching';
const RELEASE_DELAY_MS = 150;

export function suppressThemeTransitions(): void {
  const root = document.documentElement;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const observer = new MutationObserver(() => {
    document.body.classList.add(MARKER);
    void root.offsetHeight; // commit the new colours before transitions resume
    clearTimeout(timer);
    timer = setTimeout(() => document.body.classList.remove(MARKER), RELEASE_DELAY_MS);
  });

  // Windmill drives 'class'; Mantine drives 'data-mantine-color-scheme'.
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['class', 'data-mantine-color-scheme'],
  });
}
