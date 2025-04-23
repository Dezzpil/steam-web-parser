import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  CardText,
  Badge,
  Pagination,
  PaginationItem,
  PaginationLink,
  Spinner,
  Alert,
} from 'reactstrap';
import { fetchApps } from '@/api/api';

const ITEMS_PER_PAGE = 12;

function AppList() {
  const [page, setPage] = useState(0);
  const offset = page * ITEMS_PER_PAGE;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['apps', offset],
    queryFn: () => fetchApps(ITEMS_PER_PAGE, offset),
  });

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner color="primary">Loading...</Spinner>
      </div>
    );
  }

  if (isError) {
    return <Alert color="danger">Error loading apps. Please try again later.</Alert>;
  }

  const { apps, total } = data!;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div>
      <h1 className="mb-4">Steam Apps</h1>
      <Row>
        {apps.map((app) => (
          <Col key={app.id} md={4} className="mb-4">
            <Card className="app-card">
              <CardBody>
                <CardTitle tag="h5">
                  <Link to={`/app/${app.id}`}>{app.title}</Link>
                </CardTitle>
                <CardText>
                  {app.description.length > 150
                    ? `${app.description.substring(0, 150)}...`
                    : app.description}
                </CardText>
                <div>
                  {app.genre.slice(0, 3).map((genre) => (
                    <Badge key={genre} color="primary" className="tag-badge">
                      {genre}
                    </Badge>
                  ))}
                  {app.popularTags.slice(0, 3).map((tag) => (
                    <Badge key={tag} color="secondary" className="tag-badge">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {totalPages > 1 && (
        <Pagination className="d-flex justify-content-center mt-4">
          <PaginationItem disabled={page === 0}>
            <PaginationLink previous onClick={() => setPage(page - 1)} />
          </PaginationItem>

          {[...Array(totalPages).keys()].map((pageNum) => (
            <PaginationItem key={pageNum} active={pageNum === page}>
              <PaginationLink onClick={() => setPage(pageNum)}>{pageNum + 1}</PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem disabled={page === totalPages - 1}>
            <PaginationLink next onClick={() => setPage(page + 1)} />
          </PaginationItem>
        </Pagination>
      )}
    </div>
  );
}

export default AppList;
