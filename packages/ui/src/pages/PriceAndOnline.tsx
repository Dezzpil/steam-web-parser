import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Badge,
  Button,
  Col,
  Pagination,
  PaginationItem,
  PaginationLink,
  Row,
  Spinner,
} from 'reactstrap';
import { useState } from 'react';
import moment from 'moment';
import {
  fetchPriceOnlineProcesses,
  fetchActivePriceOnline,
  startPriceOnline,
  stopPriceOnline,
} from '@/api/api';
import { PriceOnlineMessage, PriceOnlineProcess } from '@/api/types';
import { DateTimeFormat } from '@/tools/date.ts';
import { FiAlertCircle, FiClock, FiDollarSign, FiList, FiPlay, FiSquare } from 'react-icons/fi';

const ITEMS_PER_PAGE = 15;

function statusBadge(status: string) {
  if (status === 'created') return <Badge color="secondary">создан</Badge>;
  if (status === 'started') return <Badge color="warning">запущен</Badge>;
  if (status === 'finished') return <Badge color="success">завершён</Badge>;
  return <Badge color="dark">{status}</Badge>;
}

function ProcessCard({ item }: { item: PriceOnlineProcess }) {
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
        {statusBadge(item.status)}
        <span className="text-muted small ms-auto">
          {moment(item.createdAt).format(DateTimeFormat)}
        </span>
      </div>
      <div className="d-flex gap-3 mt-1 small text-muted flex-wrap">
        {item.startedAt && <span>Запущен: {moment(item.startedAt).format('HH:mm:ss')}</span>}
        {item.finishedAt && <span>Завершён: {moment(item.finishedAt).format('HH:mm:ss')}</span>}
        <span>Цена: {item.priceCollected}</span>
        <span>Онлайн: {item.onlineCollected}</span>
        {item.error && (
          <span className="text-danger" style={{ wordBreak: 'break-word' }}>
            {item.error}
          </span>
        )}
      </div>
    </li>
  );
}

function ProcessList() {
  const [page, setPage] = useState(0);
  const offset = page * ITEMS_PER_PAGE;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['priceOnlineProcesses', offset],
    queryFn: () => fetchPriceOnlineProcesses(ITEMS_PER_PAGE, offset),
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
    return <Alert color="danger">Ошибка загрузки процессов</Alert>;
  }

  const { items, total } = data!;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <section>
      <h5 className="d-flex align-items-center gap-2 mb-2">
        <FiList /> Список процессов <Badge color="secondary">{total}</Badge>
      </h5>
      {items.length === 0 ? (
        <p className="text-muted">Процессов ещё нет</p>
      ) : (
        <ul className="list-unstyled mb-0">
          {items.map((item) => (
            <ProcessCard key={item.id} item={item} />
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

function ActiveProcessPanel() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['activePriceOnline'],
    queryFn: fetchActivePriceOnline,
    refetchInterval: 3000,
  });

  const startMutation = useMutation({
    mutationFn: startPriceOnline,
    onSuccess: () => {
      setStartError(null);
      queryClient.invalidateQueries({ queryKey: ['activePriceOnline'] });
      queryClient.invalidateQueries({ queryKey: ['priceOnlineProcesses'] });
    },
    onError: (err: Error) => {
      setStartError(err.message);
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopPriceOnline,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activePriceOnline'] });
      queryClient.invalidateQueries({ queryKey: ['priceOnlineProcesses'] });
    },
  });

  const messages: PriceOnlineMessage[] = data?.messages ?? [];
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
            <FiClock /> Активный процесс
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
          <dt>Статус</dt>
          <dd>{statusBadge(activeProcess.status)}</dd>
          {activeProcess.startedAt && (
            <>
              <dt>Запущен</dt>
              <dd>{moment(activeProcess.startedAt).format(DateTimeFormat)}</dd>
            </>
          )}
          <dt>Собрано цен</dt>
          <dd>{activeProcess.priceCollected}</dd>
          <dt>Собрано онлайна</dt>
          <dd>{activeProcess.onlineCollected}</dd>
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
        <FiPlay /> Запустить сбор
      </h5>
      {startError && (
        <Alert color="danger" className="d-flex align-items-center gap-2">
          <FiAlertCircle /> {startError}
        </Alert>
      )}
      <Button
        color="primary"
        disabled={startMutation.isPending}
        className="d-flex align-items-center gap-2"
        onClick={() => startMutation.mutate()}
      >
        {startMutation.isPending ? <Spinner size="sm" /> : <FiPlay />}
        Запустить
      </Button>
    </section>
  );
}

function PriceAndOnline() {
  return (
    <div>
      <h4 className="mb-4 d-flex align-items-center gap-2">
        <FiDollarSign /> Цена и Онлайн
      </h4>
      <Row>
        <Col md={4}>
          <ActiveProcessPanel />
        </Col>
        <Col md={8}>
          <ProcessList />
        </Col>
      </Row>
    </div>
  );
}

export default PriceAndOnline;
