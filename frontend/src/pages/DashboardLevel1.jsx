import { useState, useEffect } from 'react';
import api from '../services/api';

function DashboardLevel1() {
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
      <h1>Dashboard Level 1</h1>
      <p>Basic view for level 1 users</p>
      {/* Add your level 1 dashboard content here */}
    </div>
  );
}

export default DashboardLevel1;
