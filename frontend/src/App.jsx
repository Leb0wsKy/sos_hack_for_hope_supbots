import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import DashboardLevel1 from './pages/DashboardLevel1';
import DashboardLevel2 from './pages/DashboardLevel2';
import DashboardLevel3 from './pages/DashboardLevel3';
import DashboardLevel4 from './pages/DashboardLevel4';
import DashboardDirecteur from './pages/DashboardDirecteur';
import DashboardNational from './pages/DashboardNational';

/* Redirect to login when no token is present */
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard-level1" element={
          <ProtectedRoute allowedRoles={['LEVEL1','LEVEL2','LEVEL3','LEVEL4']}>
            <DashboardLevel1 />
          </ProtectedRoute>
        } />
        <Route path="/dashboard-level2" element={
          <ProtectedRoute allowedRoles={['LEVEL2','LEVEL3','LEVEL4']}>
            <DashboardLevel2 />
          </ProtectedRoute>
        } />
        <Route path="/dashboard-level3" element={
          <ProtectedRoute allowedRoles={['LEVEL3','LEVEL4']}>
            <DashboardLevel3 />
          </ProtectedRoute>
        } />
        <Route path="/dashboard-directeur" element={
          <ProtectedRoute allowedRoles={['LEVEL2','LEVEL3','LEVEL4']}>
            <DashboardDirecteur />
          </ProtectedRoute>
        } />
        <Route path="/dashboard-national" element={
          <ProtectedRoute allowedRoles={['LEVEL3','LEVEL4']}>
            <DashboardNational />
          </ProtectedRoute>
        } />
        <Route path="/dashboard-level4" element={
          <ProtectedRoute allowedRoles={['LEVEL4']}>
            <DashboardLevel4 />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
