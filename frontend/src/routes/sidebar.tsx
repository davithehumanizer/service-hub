import { ASSISTANT_ENABLED } from '../assistant';

/**
 * ⚠ These are used just to render the Sidebar!
 * You can include any link here, local or external.
 *
 * If you're looking to actual Router routes, go to
 * `routes/index.js`
 */

export type UserRole = 'customer' | 'repairer' | 'admin' | 'contributor' | 'all';

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

// By intent: find, contribute, see the impact. What one entered sits
// together under "Contribute", not among the things to look up.
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
  {
    type: 'group',
    name: 'Find',
    translationKey: 'nav.find',
    icon: 'search',
    color: 'blue',
    routes: [
      { path: '/app/devices', icon: 'devices', name: 'Devices', translationKey: 'nav.devices', roles: ['all'], color: 'blue' },
      { path: '/app/ifixit-tutorials', icon: 'menu_book', name: 'Tutorials', translationKey: 'nav.tutorials', roles: ['all'], color: 'orange' },
      { path: '/app/spare-parts', icon: 'build_circle', name: 'Spare Parts', translationKey: 'nav.spareParts', roles: ['all'], color: 'orange' },
      { path: '/app/repair-map', icon: 'map', name: 'Repair Map', translationKey: 'nav.repairMap', roles: ['all'], color: 'purple' },
      { path: '/app/api-catalog', icon: 'hub', name: 'Community Catalog', translationKey: 'nav.apiCatalog', roles: ['all'], color: 'purple' },
    ],
  },
  {
    type: 'group',
    name: 'Contribute',
    translationKey: 'nav.contribute',
    icon: 'volunteer_activism',
    color: 'customgreen',
    routes: [
      { path: '/app/my-contributions', icon: 'library_add', name: 'My Contributions', translationKey: 'nav.myContributions', roles: ['customer', 'repairer', 'admin', 'contributor'], color: 'customgreen' },
      { path: '/app/my-repairers', icon: 'add_location_alt', name: 'My Repairers', translationKey: 'nav.myRepairers', roles: ['customer', 'repairer', 'admin', 'contributor'], color: 'customgreen' },
      { path: '/app/submit-tool', icon: 'add_circle', name: 'Submit a Tool', translationKey: 'nav.submitATool', roles: ['customer', 'repairer'], color: 'customgreen' },
      { path: '/app/repairer-profile', icon: 'handyman', name: 'My Workshop', translationKey: 'nav.myWorkshop', roles: ['repairer'], color: 'customgreen' },
    ],
  },
  {
    type: 'group',
    name: 'Impact',
    translationKey: 'nav.impact',
    icon: 'insights',
    color: 'green',
    routes: [
      { path: '/app/fixometer', icon: 'eco', name: 'Impact calculator', translationKey: 'nav.impactCalculator', roles: ['all'], color: 'green' },
      { path: '/app/repair-monitor', icon: 'monitoring', name: 'Repair Monitor', translationKey: 'nav.repairMonitor', roles: ['all'], color: 'teal' },
    ],
  },
  {
    type: 'group',
    name: 'Admin',
    translationKey: 'nav.admin',
    icon: 'admin_panel_settings',
    color: 'red',
    // The daily work first, the purge last.
    routes: [
      { path: '/app/admin/repairer-proposals', icon: 'pending_actions', name: 'Repairer Proposals', translationKey: 'nav.adminRepairerProposals', roles: ['admin'], color: 'red' },
      { path: '/app/admin/repairer-reports', icon: 'flag', name: 'Repairer Reports', translationKey: 'nav.adminRepairerReports', roles: ['admin'], color: 'red' },
      { path: '/app/admin/contributors', icon: 'group_add', name: 'Contributor Accounts', translationKey: 'nav.adminContributors', roles: ['admin'], color: 'red' },
      { path: '/app/admin/api-catalog', icon: 'hub', name: 'API Catalog', translationKey: 'nav.adminApiCatalog', roles: ['admin'], color: 'red' },
      { path: '/app/admin/demo-data', icon: 'delete_sweep', name: 'Demo Data', translationKey: 'nav.adminDemoData', roles: ['admin'], color: 'red' },
    ],
  },
];

export default routes;
