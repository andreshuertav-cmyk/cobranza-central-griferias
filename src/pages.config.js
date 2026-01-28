import ClientDetail from './pages/ClientDetail';
import Home from './pages/Home';
import Reports from './pages/Reports';
import ActivityReport from './pages/ActivityReport';
import ClientManagementReport from './pages/ClientManagementReport';
import PaymentMethodsReport from './pages/PaymentMethodsReport';
import PromisesReport from './pages/PromisesReport';
import ConsolidatedPromisesReport from './pages/ConsolidatedPromisesReport';
import SalesRepReport from './pages/SalesRepReport';
import FactorizedReport from './pages/FactorizedReport';
import DailyPromisesReport from './pages/DailyPromisesReport';


export const PAGES = {
    "ClientDetail": ClientDetail,
    "Home": Home,
    "Reports": Reports,
    "ActivityReport": ActivityReport,
    "ClientManagementReport": ClientManagementReport,
    "PaymentMethodsReport": PaymentMethodsReport,
    "PromisesReport": PromisesReport,
    "ConsolidatedPromisesReport": ConsolidatedPromisesReport,
    "SalesRepReport": SalesRepReport,
    "FactorizedReport": FactorizedReport,
    "DailyPromisesReport": DailyPromisesReport,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};