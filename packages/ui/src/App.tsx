import { Routes, Route, Link } from 'react-router-dom';
import { Container, Navbar, NavbarBrand, Nav, NavItem, Badge } from 'reactstrap';
import { useState, useEffect } from 'react';
import { fetchQueueLength } from './api/api';
import AppList from './pages/AppList';
import AppDetail from './pages/AppDetail';

function App() {
  const [queueLength, setQueueLength] = useState<number | null>(null);

  useEffect(() => {
    // Function to fetch queue length
    const fetchQueue = async () => {
      try {
        const data = await fetchQueueLength();
        setQueueLength(data.length);
      } catch (error) {
        console.error('Failed to fetch queue length:', error);
      }
    };

    // Fetch queue length immediately
    fetchQueue();

    // Set up interval to fetch queue length every 10 seconds
    const intervalId = setInterval(fetchQueue, 10000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <Navbar color="dark" dark expand="md" container>
        <NavbarBrand tag={Link} to="/">
          Steam Web Parser
        </NavbarBrand>
        <Nav className="me-auto" navbar>
          <NavItem>
            <Link className="nav-link" to="/">
              Apps
            </Link>
          </NavItem>
        </Nav>
        {queueLength !== null && (
          <div className="text-light">
            Queue: <Badge color="info">{queueLength}</Badge>
          </div>
        )}
      </Navbar>
      <Container className="py-4">
        <Routes>
          <Route path="/" element={<AppList />} />
          <Route path="/app/:id" element={<AppDetail />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
