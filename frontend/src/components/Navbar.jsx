import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <nav style={{ padding: '1rem', backgroundColor: '#333', color: 'white' }}>
      <h2>Hack For Hope</h2>
      {token && (
        <div>
          <Link to="/dashboard-level1" style={{ color: 'white', marginRight: '1rem' }}>Level 1</Link>
          <Link to="/dashboard-level2" style={{ color: 'white', marginRight: '1rem' }}>Level 2</Link>
          <Link to="/dashboard-level3" style={{ color: 'white', marginRight: '1rem' }}>Level 3</Link>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
