import { useState, useEffect } from 'react';
import api from '../services/api';

function DashboardLevel3() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard Level 3</h1>
      <p>Advanced view with analytics for level 3 users</p>
      {/* Add your level 3 dashboard content here */}
    </div>
  );
}

export default DashboardLevel3;
