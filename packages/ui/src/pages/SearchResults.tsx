import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pagination,
  PaginationItem,
  PaginationLink,
  Spinner,
  Alert,
  Badge,
  Card,
  CardBody,
  Row,
  Col,
} from 'reactstrap';
import { Link } from 'react-router-dom';
import { fetchSearchResults } from '@/api/api';
import moment from 'moment';
import { DateTimeFormat } from '@/tools/date.ts';

const ITEMS_PER_PAGE = 20;

function SearchResults() {
  const [page, setPage] = useState(0);
  const offset = page * ITEMS_PER_PAGE;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['searchResults', offset],
    queryFn: () => fetchSearchResults(ITEMS_PER_PAGE, offset),
  });

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner color="primary">Loading...</Spinner>
      </div>
    );
  }

  if (isError) {
    return <Alert color="danger">Error loading search results. Please try again later.</Alert>;
  }

  const { appUrls, total } = data!;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const truncate = (text: string, length: number) => {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  return (
    <div>
      <h2 className="mb-4">Поисковые обращения</h2>

      <div className="search-results-list">
        {appUrls.map((url) => (
          <Card key={url.id} className="mb-3 border-0 shadow-sm">
            <CardBody>
              <Row className="align-items-center">
                <Col md={1} className="text-muted small">
                  ID: {url.id}
                </Col>
                <Col md={4}>
                  <div className="fw-bold">
                    {url.App ? (
                      <Link to={`/app/${url.id}`}>{truncate(url.App.title, 100)}</Link>
                    ) : (
                      <a
                        href={`https://store.steampowered.com${url.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-break"
                      >
                        {truncate(url.path, 100)}
                      </a>
                    )}
                  </div>
                </Col>
                <Col md={3}>
                  <div className="small text-muted mb-1">Запрос:</div>
                  <div>{url.foundByTerm}</div>
                </Col>
                <Col md={2}>
                  <div className="small text-muted mb-1">Создано:</div>
                  <div className="small">{moment(url.createdAt).format(DateTimeFormat)}</div>
                </Col>
                <Col md={2} className="text-end">
                  {url.grabbedAt ? (
                    <Badge color="success" pill>
                      Готово
                    </Badge>
                  ) : (
                    <Badge color="warning" pill>
                      В очереди
                    </Badge>
                  )}
                </Col>
              </Row>
            </CardBody>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination className="d-flex justify-content-center mt-4">
          <PaginationItem disabled={page === 0}>
            <PaginationLink previous onClick={() => setPage(page - 1)} />
          </PaginationItem>

          {(() => {
            const getVisiblePages = () => {
              if (totalPages <= 7) {
                return [...Array(totalPages).keys()];
              }
              const result = [];
              result.push(0);
              result.push(1);
              const leftBoundary = Math.max(2, page - 2);
              const rightBoundary = Math.min(totalPages - 3, page + 2);
              if (leftBoundary > 2) {
                result.push(-1);
              }
              for (let i = leftBoundary; i <= rightBoundary; i++) {
                result.push(i);
              }
              if (rightBoundary < totalPages - 3) {
                result.push(-2);
              }
              result.push(totalPages - 2);
              result.push(totalPages - 1);
              return result;
            };

            return getVisiblePages().map((pageNum) => {
              if (pageNum < 0) {
                return (
                  <PaginationItem key={`ellipsis${pageNum}`} disabled>
                    <PaginationLink>...</PaginationLink>
                  </PaginationItem>
                );
              }
              return (
                <PaginationItem key={pageNum} active={pageNum === page}>
                  <PaginationLink onClick={() => setPage(pageNum)}>{pageNum + 1}</PaginationLink>
                </PaginationItem>
              );
            });
          })()}

          <PaginationItem disabled={page === totalPages - 1}>
            <PaginationLink next onClick={() => setPage(page + 1)} />
          </PaginationItem>
        </Pagination>
      )}
    </div>
  );
}

export default SearchResults;
