import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IRouteGroup, IRoute, UserRole } from '../../routes/sidebar';
import { usePendingProposals } from '../../hooks/usePendingProposals';

// This group's children used to be a hard {open && <ul>} — no transition of
// any kind, so it always popped open/shut instantly. max-height is animated
// to the list's own measured scrollHeight rather than an arbitrary fixed
// value, so the reveal actually takes the full duration instead of racing
// past the real content height and sitting idle for the remainder.
const LEAVE_DURATION_MS = 200;
const ENTER_DURATION_MS = 300;

interface Props {
  group: IRouteGroup;
  userType: UserRole | null;
  globalDevice?: { model?: string } | null;
}

type ColorKey = 'blue' | 'purple' | 'orange' | 'green' | 'customgreen' | 'teal';

const colorMap: Record<ColorKey, { header: string; hover: string; active: string; border: string; iconHover: string }> = {
  blue: {
    header: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
    active: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    border: 'bg-blue-600',
    iconHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
  },
  purple: {
    header: 'text-purple-600 dark:text-purple-400',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
    active: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    border: 'bg-purple-600',
    iconHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400',
  },
  orange: {
    header: 'text-orange-600 dark:text-orange-400',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
    active: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    border: 'bg-orange-600',
    iconHover: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
  },
  green: {
    header: 'text-green-600 dark:text-green-400',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
    active: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    border: 'bg-green-600',
    iconHover: 'group-hover:text-green-600 dark:group-hover:text-green-400',
  },
  customgreen: {
    header: 'text-customgreen-600 dark:text-customgreen-400',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
    active: 'text-customgreen-600 dark:text-customgreen-400 bg-customgreen-50 dark:bg-customgreen-900/20',
    border: 'bg-customgreen-600',
    iconHover: 'group-hover:text-customgreen-600 dark:group-hover:text-customgreen-400',
  },
  teal: {
    header: 'text-teal-600 dark:text-teal-400',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
    active: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20',
    border: 'bg-teal-600',
    iconHover: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
  },
};

const PROPOSALS_PATH = '/app/admin/repairer-proposals';

const Waiting: React.FC<{ count: number }> = ({ count }) => (
  <span className="ml-auto px-2 rounded-full bg-red-600 text-white text-xs font-bold leading-5 normal-case tracking-normal">
    {count}
  </span>
);

const isRoleVisible = (route: IRoute, userType: UserRole | null): boolean => {
  if (!route.roles || route.roles.includes('all')) return true;
  if (userType && route.roles.includes(userType)) return true;
  return false;
};

const SidebarGroup: React.FC<Props> = ({ group, userType, globalDevice }) => {
  const { t } = useTranslation();
  const location = useLocation();

  const visibleRoutes = group.routes.filter((r) => isRoleVisible(r, userType));

  const hasActiveChild = visibleRoutes.some((r) =>
    location.pathname.startsWith(r.path),
  );

  // What waits in the repairer queue, on its entry and, closed, on its group.
  const waiting = usePendingProposals(
    userType === 'admin' && visibleRoutes.some((r) => r.path === PROPOSALS_PATH),
  );

  const [open, setOpen] = useState(hasActiveChild);
  const [mounted, setMounted] = useState(open);
  const [maxHeight, setMaxHeight] = useState(open ? Infinity : 0);
  const listRef = useRef<HTMLUListElement>(null);

  // Mount/unmount, driven purely by `open`.
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }

    // Collapse from the current measured height, not from Infinity — the
    // transition needs a real starting pixel value to animate away from.
    // Safe to read here: the <ul> is still mounted at this point, only the
    // deferred setMounted(false) below removes it.
    setMaxHeight(listRef.current ? listRef.current.scrollHeight : 0);
    const raf = requestAnimationFrame(() => setMaxHeight(0));
    const unmount = setTimeout(() => setMounted(false), LEAVE_DURATION_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(unmount); };
  }, [open]);

  // Measuring and animating the reveal needs its own effect, gated on
  // `mounted` rather than done inline in the effect above: when `open`
  // first flips true, the <ul> isn't in the DOM yet (setMounted(true) only
  // takes effect on the *next* render), so listRef.current would still be
  // null at that point. Depending on `mounted` here guarantees this only
  // runs once the element — and the ref — actually exist.
  useEffect(() => {
    if (!open || !mounted) return;
    const raf = requestAnimationFrame(() => {
      setMaxHeight(listRef.current ? listRef.current.scrollHeight : 0);
    });
    // Then no cap: a label that wraps later (the icon font arriving, another
    // language) would otherwise be cut off at the height measured here.
    const uncap = setTimeout(() => setMaxHeight(Infinity), ENTER_DURATION_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(uncap); };
  }, [open, mounted]);

  // Every hook above must run on every render — bailing out before them
  // whenever the group has no visible routes (routes.length depends on
  // userType, which starts null and resolves after auth loads) would
  // change how many hooks get called between renders.
  if (visibleRoutes.length === 0) return null;

  const colors = colorMap[(group.color as ColorKey)] ?? colorMap.customgreen;

  // A group holding one item for this user is a link to it: a submenu took
  // two taps to reach it and did not say there was nothing else (PBI 13905).
  if (visibleRoutes.length === 1) {
    const [only] = visibleRoutes;
    return (
      <li className="relative px-3 py-1">
        <NavLink
          exact={only.exact}
          to={only.path}
          className={`group inline-flex items-center w-full text-sm font-semibold transition-all duration-200 rounded-lg px-3 py-2 ${colors.hover}`}
          activeClassName={colors.active}
        >
          <span
            className={`absolute inset-y-0 left-0 w-0.5 rounded-tr-lg rounded-br-lg transition-all duration-200 ${colors.border}`}
            style={{ opacity: location.pathname.startsWith(only.path) ? 1 : 0 }}
            aria-hidden="true"
          />
          <span className={`material-symbols-outlined text-base transition-colors duration-200 ${colors.iconHover}`} aria-hidden="true">
            {group.icon}
          </span>
          <span className="ml-3">{t(group.translationKey)}</span>
        </NavLink>
      </li>
    );
  }

  const getRouteColors = (route: IRoute) =>
    colorMap[((route.color ?? group.color) as ColorKey)] ?? colorMap.customgreen;

  return (
    <li className="relative px-3 py-1">
      {/* Group header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-start justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors duration-200 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700`}
        aria-expanded={open}
      >
        <span className="flex items-start gap-2 text-left">
          <span className={`material-symbols-outlined text-base ${colors.header}`} aria-hidden="true">
            {group.icon}
          </span>
          <span className={`text-left leading-tight ${colors.header}`}>{t(group.translationKey)}</span>
        </span>
        <span className="flex items-center gap-2">
          {!open && waiting > 0 && <Waiting count={waiting} />}
          <span
            className={`material-symbols-outlined text-xl leading-none transform transition-transform duration-200 ${open ? 'rotate-180' : ''} ${colors.header}`}
            aria-hidden="true"
          >
            expand_more
          </span>
        </span>
      </button>

      {/* Children */}
      {mounted && (
        <ul
          ref={listRef}
          aria-hidden={!open}
          className={`mt-1 ml-2 border-l border-gray-200 dark:border-gray-700 pl-2 overflow-hidden transition-all ${open ? 'ease-out duration-300' : 'ease-in duration-200'}`}
          style={maxHeight === Infinity ? undefined : { maxHeight }}
        >
          {visibleRoutes.map((route) => {
            const routeColors = getRouteColors(route);
            const linkPath =
              route.name === 'Tutorials' && globalDevice?.model
                ? `/app/ifixit-tutorials/${globalDevice.model}`
                : route.path;

            return (
              <li className="relative py-1" key={route.name}>
                <NavLink
                  exact={route.exact}
                  to={linkPath}
                  className={`group inline-flex items-center w-full text-sm font-semibold transition-all duration-200 rounded-lg px-3 py-2 ${routeColors.hover}`}
                  activeClassName={routeColors.active}
                >
                  {/* Active indicator stripe */}
                  <span
                    className={`absolute inset-y-0 left-0 w-0.5 rounded-tr-lg rounded-br-lg transition-all duration-200 ${routeColors.border}`}
                    style={{ opacity: location.pathname.startsWith(route.path) ? 1 : 0 }}
                    aria-hidden="true"
                  />
                  <span
                    className={`material-symbols-outlined w-5 h-5 text-base transition-colors duration-200 ${routeColors.iconHover}`}
                    aria-hidden="true"
                  >
                    {route.icon}
                  </span>
                  <span className="ml-3">{t(route.translationKey)}</span>
                  {route.path === PROPOSALS_PATH && waiting > 0 && <Waiting count={waiting} />}
                </NavLink>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};

export default SidebarGroup;
