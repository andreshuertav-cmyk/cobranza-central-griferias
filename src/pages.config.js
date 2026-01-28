/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ActivityReport from './pages/ActivityReport';
import ClientDetail from './pages/ClientDetail';
import ClientManagementReport from './pages/ClientManagementReport';
import ConsolidatedPromisesReport from './pages/ConsolidatedPromisesReport';
import DailyPromisesReport from './pages/DailyPromisesReport';
import FactorizedReport from './pages/FactorizedReport';
import Home from './pages/Home';
import PaymentMethodsReport from './pages/PaymentMethodsReport';
import PromisesReport from './pages/PromisesReport';
import Reports from './pages/Reports';
import SalesRepReport from './pages/SalesRepReport';


export const PAGES = {
    "ActivityReport": ActivityReport,
    "ClientDetail": ClientDetail,
    "ClientManagementReport": ClientManagementReport,
    "ConsolidatedPromisesReport": ConsolidatedPromisesReport,
    "DailyPromisesReport": DailyPromisesReport,
    "FactorizedReport": FactorizedReport,
    "Home": Home,
    "PaymentMethodsReport": PaymentMethodsReport,
    "PromisesReport": PromisesReport,
    "Reports": Reports,
    "SalesRepReport": SalesRepReport,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};