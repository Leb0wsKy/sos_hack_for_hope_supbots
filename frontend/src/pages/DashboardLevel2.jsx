import { useState, useEffect } from 'react';
import api from '../services/api';

function DashboardLevel2() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/signalement');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard Level 2</h1>
      <p>Intermediate view for level 2 users</p>
      {/* Add your level 2 dashboard content here */}
    </div>
  );
}

export default DashboardLevel2;
