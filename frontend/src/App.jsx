import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import DashboardLevel1 from './pages/DashboardLevel1';
import DashboardLevel2 from './pages/DashboardLevel2';
import DashboardLevel3 from './pages/DashboardLevel3';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard-level1" element={<DashboardLevel1 />} />
        <Route path="/dashboard-level2" element={<DashboardLevel2 />} />
        <Route path="/dashboard-level3" element={<DashboardLevel3 />} />
      </Routes>
    </Router>
  );
}

export default App;
