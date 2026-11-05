import { lazy } from "react";
import { ASSISTANT_ENABLED } from "../assistant";

// use lazy for better code splitting, a.k.a. load faster
const Dashboard = lazy(() => import("../pages/Dashboard"));
const HomePage = lazy(() => import("../pages/HomePage"));
const Profile = lazy(() => import("../pages/Profile"));
const ProfileEdit = lazy(() => import("../pages/ProfileEdit"));
const RepairMap = lazy(() => import("../pages/RepairMap"));
const RepairerDetails = lazy(() => import("../pages/RepairerDetails"));
const Devices = lazy(() => import("../pages/Devices"));
const DeviceDetails = lazy(() => import("../pages/DeviceDetails"));
const ModelDetails = lazy(() => import("../pages/ModelDetails"));
const CreateDevice = lazy(() => import("../pages/CreateDevice"));
const IfixitTutorials = lazy(() => import("../pages/IfixitTutorials"));
const FixometerPage = lazy(() => import("../pages/FixometerPage"));
const ImpactDetailsPage = lazy(() => import("../pages/ImpactDetailsPage"));
const Wizard = lazy(() => import("../components/Wizard/Wizard"));
const RecycleInfo = lazy(() => import("../pages/RecycleInfo"));
const ReuseInfo = lazy(() => import("../pages/ReuseInfo"));
const CustomerOnboarding = lazy(
  () => import("../components/CustomerOnboarding/CustomerOnboarding"),
);
const RepairerOnboarding = lazy(
  () => import("../components/RepairerOnboarding/RepairerOnboarding"),
);
const RepairerProfilePage = lazy(() => import("../pages/RepairerProfilePage"));
const ApiCatalogPage = lazy(() => import("../pages/ApiCatalogPage"));
const ApiToolDetailPage = lazy(() => import("../pages/ApiToolDetailPage"));
const SubmitToolPage = lazy(() => import("../pages/SubmitToolPage"));
const SparePartsCatalog = lazy(() => import("../pages/SparePartsCatalog"));
const SparePartDetail = lazy(() => import("../pages/SparePartDetail"));
const AdminApiCatalogPage = lazy(() => import("../pages/AdminApiCatalogPage"));
const AdminRepairerReportsPage = lazy(
  () => import("../pages/AdminRepairerReportsPage"),
);
const RepairMonitorPage = lazy(() => import("../pages/RepairMonitorPage"));
const MyRepairs = lazy(() => import("../pages/MyRepairs"));
const AssistantPage = lazy(() => import("../pages/AssistantPage"));
// const Forms = lazy(() => import("../pages/Forms"));
// const Cards = lazy(() => import("../pages/Cards"));
// const Charts = lazy(() => import("../pages/Charts"));
// const Buttons = lazy(() => import("../pages/Buttons"));
// const Modals = lazy(() => import("../pages/Modals"));
// const Tables = lazy(() => import("../pages/Tables"));
// const Page404 = lazy(() => import("../pages/404"));
// const Blank = lazy(() => import("../pages/Blank"));

/**
 * ⚠ These are internal routes!
 * They will be rendered inside the app, using the default `containers/Layout`.
 * If you want to add a route to, let's say, a landing page, you should add
 * it to the `App`'s router, exactly like `Login`, `CreateAccount` and other pages
 * are routed.
 *
 * If you're looking for the links rendered in the SidebarContent, go to
 * `routes/sidebar.js`
 */
const routes = [
  {
    path: "/home", // the url
    component: HomePage, // view rendered
  },
  {
    path: "/dashboard", // the url
    component: Dashboard, // view rendered
  },

  {
    path: "/repair-map", // the url
    component: RepairMap, // view rendered
  },
  {
    path: "/profile", // the url
    component: Profile, // view rendered
  },
  {
    path: "/profileEdit", // the url
    component: ProfileEdit, // view rendered
  },
  {
    path: "/repairer/:id", // the url
    component: RepairerDetails, // view rendered
  },
  {
    path: "/devices/", // the url
    component: Devices, // view rendered
  },
  {
    path: "/device/:id", // the url
    component: DeviceDetails, // view rendered
  },
  {
    path: "/model/:id",
    component: ModelDetails,
  },
  {
    path: "/create-device",
    component: CreateDevice,
  },
  {
    path: "/ifixit-tutorials", // the url
    component: IfixitTutorials, // view rendered
  },
  {
    path: "/ifixit-tutorials/:deviceName", // the url
    component: IfixitTutorials, // view rendered
  },
  {
    path: "/fixometer", // the url
    component: FixometerPage, // view rendered
  },
  {
    path: "/impact-details", // the url
    component: ImpactDetailsPage, // view rendered
  },
  {
    path: "/wizard", // the url
    component: Wizard, // view rendered
  },
  {
    path: "/recycle-info",
    component: RecycleInfo,
  },
  {
    path: "/reuse-info",
    component: ReuseInfo,
  },
  {
    path: "/onboarding",
    component: CustomerOnboarding,
  },
  {
    path: "/repairer-onboarding",
    component: RepairerOnboarding,
  },
  {
    path: "/repairer-profile",
    component: RepairerProfilePage,
  },
  {
    path: "/api-catalog",
    component: ApiCatalogPage,
  },
  {
    path: "/api-catalog/:id",
    component: ApiToolDetailPage,
  },
  {
    path: "/submit-tool",
    component: SubmitToolPage,
  },
  {
    path: "/admin/api-catalog",
    component: AdminApiCatalogPage,
  },
  {
    path: "/admin/repairer-reports",
    component: AdminRepairerReportsPage,
  },
  {
    path: "/spare-parts",
    component: SparePartsCatalog,
  },
  {
    path: "/spare-parts/:id",
    component: SparePartDetail,
  },
  {
    path: "/repair-monitor",
    component: RepairMonitorPage,
  },
  {
    path: "/my-repairs",
    component: MyRepairs,
  },
  ...(ASSISTANT_ENABLED
    ? [
        {
          path: "/assistant",
          component: AssistantPage,
        },
      ]
    : []),

  // {
  //   path: '/forms',
  //   component: Forms,
  // },
  // {
  //   path: '/cards',
  //   component: Cards,
  // },
  // {
  //   path: '/charts',
  //   component: Charts,
  // },
  // {
  //   path: '/buttons',
  //   component: Buttons,
  // },
  // {
  //   path: '/modals',
  //   component: Modals,
  // },
  // {
  //   path: '/tables',
  //   component: Tables,
  // },
  // {
  //   path: '/404',
  //   component: Page404,
  // },
  // {
  //   path: '/blank',
  //   component: Blank,
  // }
];

export default routes;
