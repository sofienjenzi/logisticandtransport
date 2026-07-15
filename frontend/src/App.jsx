import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LogisticsDataProvider } from './context/LogisticsDataContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MlOverviewPage from './pages/MlOverviewPage.jsx';
import MlDeliveryPage from './pages/MlDeliveryPage.jsx';
import MlClientPage from './pages/MlClientPage.jsx';
import MlMaintenancePage from './pages/MlMaintenancePage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <LogisticsDataProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard/:key" element={<DashboardPage />} />
          <Route path="/ml" element={<MlOverviewPage />} />
          <Route path="/ml/delivery" element={<MlDeliveryPage />} />
          <Route path="/ml/client" element={<MlClientPage />} />
          <Route path="/ml/maintenance" element={<MlMaintenancePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LogisticsDataProvider>
    </BrowserRouter>
  );
}
