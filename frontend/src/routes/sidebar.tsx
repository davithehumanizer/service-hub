import { ASSISTANT_ENABLED } from '../assistant';

/**
 * ⚠ These are used just to render the Sidebar!
 * You can include any link here, local or external.
 *
 * If you're looking to actual Router routes, go to
 * `routes/index.js`
 */

export type UserRole = 'customer' | 'repairer' | 'admin' | 'all';

export interface IRoute {
  path: string;
  icon: string;
  name: string;
  translationKey: string;
  exact?: boolean;
  roles?: UserRole[];
  color?: string;
}

export interface IRouteGroup {
  type: 'group';
  name: string;
  translationKey: string;
  icon: string;
  color: string;
  routes: IRoute[];
}

export interface IStandaloneRoute extends IRoute {
  type: 'standalone';
}

export type ISidebarEntry = IStandaloneRoute | IRouteGroup;

const routes: ISidebarEntry[] = [
  {
    type: 'standalone',
    path: '/app/home',
    icon: 'dashboard',
    name: 'Home',
    translationKey: 'nav.home',
    roles: ['all'],
  },
  {
    type: 'standalone',
    path: '/app/wizard',
    icon: 'route',
    name: 'Repair Journey',
    translationKey: 'nav.repairJourney',
    roles: ['all'],
  },
  {
    type: 'standalone',
    path: '/app/my-repairs',
    icon: 'fact_check',
    name: 'My Repairs',
    translationKey: 'nav.myRepairs',
    roles: ['all'],
  },
  {
    type: 'group',
    name: 'Tools',
    translationKey: 'nav.tools',
    icon: 'build',
    color: 'blue',
    routes: [
      { path: '/app/devices', icon: 'devices', name: 'Devices', translationKey: 'nav.devices', roles: ['all'], color: 'blue' },
      { path: '/app/spare-parts', icon: 'build_circle', name: 'Spare Parts', translationKey: 'nav.spareParts', roles: ['all'], color: 'orange' },
      { path: '/app/repair-map', icon: 'map', name: 'Repair Map', translationKey: 'nav.repairMap', roles: ['all'], color: 'purple' },
      { path: '/app/ifixit-tutorials', icon: 'menu_book', name: 'Tutorials', translationKey: 'nav.tutorials', roles: ['all'], color: 'orange' },
      { path: '/app/fixometer', icon: 'eco', name: 'Impact calculator', translationKey: 'nav.impactCalculator', roles: ['all'], color: 'green' },
      { path: '/app/repair-monitor', icon: 'monitoring', name: 'Repair Monitor', translationKey: 'nav.repairMonitor', roles: ['all'], color: 'teal' },
    ],
  },
  {
    type: 'group',
    name: 'Repairer',
    translationKey: 'nav.repairer',
    icon: 'store',
    color: 'orange',
    routes: [
      { path: '/app/repairer-profile', icon: 'handyman', name: 'My Workshop', translationKey: 'nav.myWorkshop', roles: ['repairer'] },
    ],
  },
  {
    type: 'group',
    name: 'API Catalog',
    translationKey: 'nav.apiCatalog',
    icon: 'api',
    color: 'purple',
    routes: [
      { path: '/app/api-catalog', icon: 'hub', name: 'Catalog', translationKey: 'nav.catalog', roles: ['all'] },
      { path: '/app/submit-tool', icon: 'add_circle', name: 'Submit a Tool', translationKey: 'nav.submitATool', roles: ['customer', 'repairer'] },
    ],
  },
  {
    type: 'group',
    name: 'Admin',
    translationKey: 'nav.admin',
    icon: 'admin_panel_settings',
    color: 'red',
    routes: [
      { path: '/app/admin/api-catalog', icon: 'hub', name: 'API Catalog', translationKey: 'nav.adminApiCatalog', roles: ['admin'], color: 'red' },
      { path: '/app/admin/repairer-reports', icon: 'flag', name: 'Repairer Reports', translationKey: 'nav.adminRepairerReports', roles: ['admin'], color: 'red' },
    ],
  },
  ...(ASSISTANT_ENABLED
    ? [
        {
          type: 'standalone',
          path: '/app/assistant',
          icon: 'smart_toy',
          name: 'Assistant',
          translationKey: 'nav.assistant',
          roles: ['all'],
        } as IStandaloneRoute,
      ]
    : []),
];

export default routes;
