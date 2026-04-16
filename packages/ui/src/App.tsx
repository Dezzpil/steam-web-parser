import { Routes, Route, Link } from 'react-router-dom';
import { Container, Navbar, NavbarBrand, Nav, NavItem, Badge } from 'reactstrap';
import { useState, useEffect } from 'react';
import { fetchQueueLength, fetchStats } from './api/api';
import AppList from './pages/AppList';
import AppDetail from './pages/AppDetail';
import SearchResults from './pages/SearchResults';
import Crawlings from './pages/Crawlings';
import PriceAndOnline from './pages/PriceAndOnline';

function App() {
  const [queueLength, setQueueLength] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    totalApps: number;
    freeApps: number;
    paidApps: number;
    downloadable: number;
    nonDownloadable: number;
  } | null>(null);

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

    // Function to fetch statistics
    const fetchStatistics = async () => {
      try {
        const data = await fetchStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      }
    };

    // Fetch data immediately
    fetchQueue();
    fetchStatistics();

    // Set up interval to fetch data every 10 seconds
    const queueIntervalId = setInterval(fetchQueue, 10000);
    const statsIntervalId = setInterval(fetchStatistics, 10000);

    // Clean up intervals on component unmount
    return () => {
      clearInterval(queueIntervalId);
      clearInterval(statsIntervalId);
    };
  }, []);

  return (
    <>
      <Navbar color="dark" dark expand="md" container>
        <NavbarBrand as={Link} to="/" className="d-flex gap-3 align-items-center">
          <img
            src="https://gamersbase.store/src/images/themes/assets/images/site-logo.svg"
            alt="GamersBase Logo"
            height="40"
            className="me-2"
          />
          <span>Steam Web Parser</span>
        </NavbarBrand>
        <Nav className="me-auto" navbar>
          <NavItem>
            <Link className="nav-link" to="/">
              Приложения
            </Link>
          </NavItem>
          <NavItem>
            <Link className="nav-link" to="/search-results">
              Запросы
            </Link>
          </NavItem>
          <NavItem>
            <Link className="nav-link" to="/crawlings">
              Краулинги
            </Link>
          </NavItem>
          <NavItem>
            <Link className="nav-link" to="/price-and-online">
              Цена и Онлайн
            </Link>
          </NavItem>
        </Nav>
      </Navbar>
      <Navbar color={'dark'} light expand="md" container>
        <div className="d-flex gap-3 mb-1">
          {stats && (
            <>
              <div className="text-light d-flex gap-2 align-items-center">
                Всего: <Badge color="primary">{stats.totalApps}</Badge>
              </div>
              <div className="text-light d-flex gap-2 align-items-center">
                Платные / Бесплатные:
                <Badge color="secondary">{stats.paidApps}</Badge>/
                <Badge color="primary">{stats.freeApps}</Badge>
              </div>
              <div className="text-light d-flex gap-2 align-items-center">
                DLC / Non-DLC:
                <Badge color="secondary">{stats.downloadable}</Badge>/
                <Badge color="primary">{stats.nonDownloadable}</Badge>
              </div>
            </>
          )}
          {queueLength !== null && (
            <div className="text-light">
              Queue: <Badge color="info">{queueLength}</Badge>
            </div>
          )}
        </div>
      </Navbar>
      <Container className="py-4">
        <Routes>
          <Route path="/" element={<AppList />} />
          <Route path="/app/:id" element={<AppDetail />} />
          <Route path="/search-results" element={<SearchResults />} />
          <Route path="/crawlings" element={<Crawlings />} />
          <Route path="/price-and-online" element={<PriceAndOnline />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
