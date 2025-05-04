import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pagination,
  PaginationItem,
  PaginationLink,
  Spinner,
  Alert,
  ButtonGroup,
  Button,
} from 'reactstrap';
import { fetchApps } from '@/api/api';
import AppListComponent from '@/components/AppList';

const ITEMS_PER_PAGE = 12;

// Define sort options
const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'По последнему обновлению' },
  { value: 'maxOnline', label: 'По максимальному онлайну' },
  { value: 'price', label: 'Самые дешевые' },
  { value: 'free', label: 'Бесплатные' },
];

function AppList() {
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const offset = page * ITEMS_PER_PAGE;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['apps', offset, sortBy],
    queryFn: () => fetchApps(ITEMS_PER_PAGE, offset, sortBy),
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
      <div className="mb-4">
        <h5 className="mb-3">Быстрая сортировка:</h5>
        <ButtonGroup>
          {SORT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              color={sortBy === option.value ? 'primary' : 'secondary'}
              onClick={() => setSortBy(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <AppListComponent apps={apps} />

      {totalPages > 1 && (
        <Pagination className="d-flex justify-content-center mt-4">
          <PaginationItem disabled={page === 0}>
            <PaginationLink previous onClick={() => setPage(page - 1)} />
          </PaginationItem>

          {(() => {
            // Function to generate page numbers to display
            const getVisiblePages = () => {
              // For small number of pages, show all pages
              if (totalPages <= 7) {
                return [...Array(totalPages).keys()];
              }

              const result = [];

              // Always show first 2 pages
              result.push(0);
              result.push(1);

              // Calculate the range around current page (show 2 pages on each side when possible)
              const leftBoundary = Math.max(2, page - 2);
              const rightBoundary = Math.min(totalPages - 3, page + 2);

              // Add ellipsis if there's a gap between first pages and current page range
              if (leftBoundary > 2) {
                result.push(-1); // Ellipsis after first pages
              }

              // Add pages around current page
              for (let i = leftBoundary; i <= rightBoundary; i++) {
                result.push(i);
              }

              // Add ellipsis if there's a gap between current page range and last pages
              if (rightBoundary < totalPages - 3) {
                result.push(-2); // Ellipsis before last pages
              }

              // Always show last 2 pages
              result.push(totalPages - 2);
              result.push(totalPages - 1);

              return result;
            };

            return getVisiblePages().map((pageNum) => {
              if (pageNum < 0) {
                // Render ellipsis
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

export default AppList;
