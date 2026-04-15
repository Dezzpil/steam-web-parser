import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Col,
  Form,
  FormGroup,
  Input,
  Label,
  Pagination,
  PaginationItem,
  PaginationLink,
  Row,
  Spinner,
} from 'reactstrap';
import moment from 'moment';
import { fetchActiveCrawling, fetchCrawlings, startCrawling, stopCrawling } from '@/api/api';
import { CrawlMessage, CrawlProcess } from '@/api/types';
import { DateTimeFormat } from '@/tools/date.ts';
import { FiAlertCircle, FiClock, FiList, FiPlay, FiSquare } from 'react-icons/fi';

const ITEMS_PER_PAGE = 15;

const CRAWL_TYPES = [
  { value: 'crawl', label: 'Общий (crawl)' },
  { value: 'crawl:top', label: 'Бестселлеры (crawl:top)' },
  { value: 'crawl:catalog', label: 'Каталог (crawl:catalog)' },
];

const SORT_OPTIONS = [
  { value: '', label: '— нет —' },
  { value: 'Released_DESC', label: 'Released_DESC' },
  { value: 'Reviews_DESC', label: 'Reviews_DESC' },
];

function statusBadge(status: string) {
  if (status === 'created') return <Badge color="secondary">создан</Badge>;
  if (status === 'started') return <Badge color="warning">запущен</Badge>;
  if (status === 'finished') return <Badge color="success">завершён</Badge>;
  return <Badge color="dark">{status}</Badge>;
}

function CrawlCard({ item }: { item: CrawlProcess }) {
  return (
    <li
      style={{
        borderBottom: '1px solid var(--bs-border-color)',
        paddingBlock: '0.6rem',
      }}
    >
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className="text-muted" style={{ minWidth: 28 }}>
          #{item.id}
        </span>
        <code>{item.type}</code>
        {item.sortBy && <Badge>{item.sortBy}</Badge>}
        {statusBadge(item.status)}
        <span className="text-muted small ms-auto">
          {moment(item.createdAt).format(DateTimeFormat)}
        </span>
      </div>
      <div className="d-flex gap-3 mt-1 small text-muted flex-wrap">
        {item.startedAt && <span>Запущен: {moment(item.startedAt).format('HH:mm:ss')}</span>}
        {item.finishedAt && <span>Завершён: {moment(item.finishedAt).format('HH:mm:ss')}</span>}
        <span>Просм.: {item.seen}</span>
        <span>Добавл.: {item.added}</span>
        {item.error && (
          <span className="text-danger" style={{ wordBreak: 'break-word' }}>
            {item.error}
          </span>
        )}
      </div>
    </li>
  );
}

function CrawlingsList() {
  const [page, setPage] = useState(0);
  const offset = page * ITEMS_PER_PAGE;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crawlings', offset],
    queryFn: () => fetchCrawlings(ITEMS_PER_PAGE, offset),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center my-4">
        <Spinner color="primary" />
      </div>
    );
  }

  if (isError) {
    return <Alert color="danger">Ошибка загрузки краулингов</Alert>;
  }

  const { items, total } = data!;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <section>
      <h5 className="d-flex align-items-center gap-2 mb-2">
        <FiList /> Список краулингов <Badge color="secondary">{total}</Badge>
      </h5>
      {items.length === 0 ? (
        <p className="text-muted">Краулингов ещё нет</p>
      ) : (
        <ul className="list-unstyled mb-0">
          {items.map((item) => (
            <CrawlCard key={item.id} item={item} />
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <Pagination className="d-flex justify-content-center mt-3">
          <PaginationItem disabled={page === 0}>
            <PaginationLink previous onClick={() => setPage(page - 1)} />
          </PaginationItem>
          {Array.from({ length: totalPages }, (_, i) => (
            <PaginationItem key={i} active={i === page}>
              <PaginationLink onClick={() => setPage(i)}>{i + 1}</PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem disabled={page >= totalPages - 1}>
            <PaginationLink next onClick={() => setPage(page + 1)} />
          </PaginationItem>
        </Pagination>
      )}
    </section>
  );
}

function ActiveCrawlingPanel() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [crawlType, setCrawlType] = useState('crawl:top');
  const [sortBy, setSortBy] = useState('');
  const [startError, setStartError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['activeCrawling'],
    queryFn: fetchActiveCrawling,
    refetchInterval: 3000,
  });

  const startMutation = useMutation({
    mutationFn: () => startCrawling(crawlType, sortBy || null),
    onSuccess: () => {
      setStartError(null);
      queryClient.invalidateQueries({ queryKey: ['activeCrawling'] });
      queryClient.invalidateQueries({ queryKey: ['crawlings'] });
    },
    onError: (err: Error) => {
      setStartError(err.message);
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopCrawling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeCrawling'] });
      queryClient.invalidateQueries({ queryKey: ['crawlings'] });
    },
  });

  const messages: CrawlMessage[] = data?.messages ?? [];
  const activeProcess = data?.process ?? null;

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center my-4">
        <Spinner color="primary" />
      </div>
    );
  }

  if (activeProcess) {
    return (
      <section>
        <div className="d-flex align-items-center gap-2 mb-3">
          <h5 className="mb-0 d-flex align-items-center gap-2">
            <FiClock /> Активный краулинг
          </h5>
          <Button
            color="danger"
            size="sm"
            className="ms-auto d-flex align-items-center gap-1"
            disabled={stopMutation.isPending}
            onClick={() => stopMutation.mutate()}
          >
            {stopMutation.isPending ? <Spinner size="sm" /> : <FiSquare />}
            Остановить
          </Button>
        </div>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem' }}>
          <dt>ID</dt>
          <dd>#{activeProcess.id}</dd>
          <dt>Тип</dt>
          <dd>
            <code>{activeProcess.type}</code>
          </dd>
          {activeProcess.sortBy && (
            <>
              <dt>Сортировка</dt>
              <dd>{activeProcess.sortBy}</dd>
            </>
          )}
          <dt>Статус</dt>
          <dd>{statusBadge(activeProcess.status)}</dd>
          {activeProcess.startedAt && (
            <>
              <dt>Запущен</dt>
              <dd>{moment(activeProcess.startedAt).format(DateTimeFormat)}</dd>
            </>
          )}
          <dt>Просмотрено</dt>
          <dd>{activeProcess.seen}</dd>
          <dt>Добавлено</dt>
          <dd>{activeProcess.added}</dd>
        </dl>

        {messages.length > 0 && (
          <div
            style={{
              background: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              padding: '0.75rem',
              borderRadius: 4,
              maxHeight: 280,
              overflowY: 'auto',
              marginTop: '0.75rem',
            }}
          >
            {messages.map((m, i) => (
              <div key={i}>
                <span style={{ color: '#569cd6' }}>{moment(m.ts).format('HH:mm:ss')}</span> {m.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </section>
    );
  }

  return (
    <section>
      <h5 className="d-flex align-items-center gap-2 mb-3">
        <FiPlay /> Запустить краулинг
      </h5>
      {startError && (
        <Alert color="danger" className="d-flex align-items-center gap-2">
          <FiAlertCircle /> {startError}
        </Alert>
      )}
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          startMutation.mutate();
        }}
      >
        <FormGroup>
          <Label for="crawlType">Тип</Label>
          <Input
            id="crawlType"
            type="select"
            value={crawlType}
            onChange={(e) => setCrawlType(e.target.value)}
          >
            {CRAWL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Input>
        </FormGroup>
        <FormGroup>
          <Label for="sortBy">Сортировка</Label>
          <Input
            id="sortBy"
            type="select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Input>
        </FormGroup>
        <Button
          type="submit"
          color="primary"
          disabled={startMutation.isPending}
          className="d-flex align-items-center gap-2"
        >
          {startMutation.isPending ? <Spinner size="sm" /> : <FiPlay />}
          Запустить
        </Button>
      </Form>
    </section>
  );
}

function Crawlings() {
  return (
    <div>
      <h4 className="mb-4">Краулинги</h4>
      <Row>
        <Col md={4}>
          <ActiveCrawlingPanel />
        </Col>
        <Col md={8}>
          <CrawlingsList />
        </Col>
      </Row>
    </div>
  );
}

export default Crawlings;
