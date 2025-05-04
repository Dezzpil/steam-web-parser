import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Spinner,
  Alert,
  Card,
  CardBody,
  Badge,
  Row,
  Col,
  CardHeader,
  CardTitle,
  CardSubtitle,
  Button,
  Collapse,
} from 'reactstrap';
import { fetchAppById, fetchRelatedApps } from '@/api/api';
import AppList from '@/components/AppList';
import moment from 'moment';
import { DateTimeFormat } from '@/tools/date.ts';

function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const appId = parseInt(id || '0');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const {
    data: app,
    isLoading: isLoadingApp,
    isError: isErrorApp,
  } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => fetchAppById(appId),
    enabled: !!appId,
  });

  const {
    data: relatedApps,
    isLoading: isLoadingRelated,
    isError: isErrorRelated,
  } = useQuery({
    queryKey: ['relatedApps', appId],
    queryFn: () => fetchRelatedApps(appId),
    enabled: !!appId,
  });

  if (isLoadingApp || isLoadingRelated) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner color="primary">Loading...</Spinner>
      </div>
    );
  }

  if (isErrorApp) {
    return <Alert color="danger">Error loading app details. Please try again later.</Alert>;
  }

  if (!app) {
    return <Alert color="warning">App not found.</Alert>;
  }

  return (
    <div>
      <Row className={'mb-4 d-flex justify-content-between align-items-stretch'}>
        <Col md={8}>
          <Card>
            <CardBody>
              <CardTitle tag="h3">{app.title}</CardTitle>
              <CardSubtitle className="mb-2 text-muted d-flex justify-content-between align-items-center">
                {app.isDownloadableContent ? <code>Доп. контент</code> : <span>Приложение</span>}
                <a
                  href={`https://store.steampowered.com/app/${app.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Steam link
                </a>
              </CardSubtitle>
              <p>{app.descriptionMini}</p>
              {app.description && app.description.length > 500 ? (
                <div className="mb-3">
                  <Collapse isOpen={isDescriptionExpanded}>
                    <div
                      className="description-html mb-3"
                      dangerouslySetInnerHTML={{ __html: app.description }}
                    />
                  </Collapse>
                  <Button
                    color="link"
                    className="p-0"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  >
                    {isDescriptionExpanded ? 'Скрыть описание' : 'Показать полное описание'}
                  </Button>
                </div>
              ) : (
                <div
                  className="description-html mb-3"
                  dangerouslySetInnerHTML={{ __html: app.description }}
                />
              )}
              <h5>Категории</h5>
              <div className="mb-3">
                {app.categories.map((cat) => (
                  <Badge key={cat} color="secondary" className="tag-badge">
                    {cat}
                  </Badge>
                ))}
              </div>
              <h5 className="mt-4">Жанры</h5>
              <div className="mb-3">
                {app.genre.map((genre) => (
                  <Badge key={genre} color="primary" className="tag-badge">
                    {genre}
                  </Badge>
                ))}
              </div>

              <h5>Популярные теги</h5>
              <div>
                {app.popularTags.map((tag) => (
                  <Badge key={tag} color="success" className="tag-badge">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            {app.linkToLogoImg && (
              <img src={app.linkToLogoImg} alt={`${app.title} logo`} className="img-fluid" />
            )}

            <CardBody className="mb-3">
              <ul className="list-inline">
                <li className="list-inline-item">
                  <b>Релиз:</b>
                </li>
                <li className="list-inline-item">{app.releaseDate}</li>
              </ul>

              <ul className="list-inline">
                <li className="list-inline-item">
                  <b>Отзывы:</b>
                </li>
                <li className="list-inline-item">{app.reviewsSummaryExplain}</li>
              </ul>

              <ul className="list-inline">
                <li className="list-inline-item">
                  <b>Разработчики:</b>
                </li>
                {app.developers.length > 0 ? (
                  <li className="list-inline-item d-inline-flex gap-2">
                    {app.developers.map((dev) => (
                      <span>{dev}</span>
                    ))}
                  </li>
                ) : (
                  <span>&mdash;</span>
                )}
              </ul>
            </CardBody>

            {app.Price && app.Price.length > 0 && (
              <>
                <CardHeader>Цена 💵</CardHeader>
                <ul className="list-group list-group-flush mb-3">
                  {app.Price.map((price) => (
                    <li className="list-group-item d-flex justify-content-between align-items-center">
                      <span className="text-muted">
                        {moment(price.createdAt).format(DateTimeFormat)}
                      </span>
                      {price.discount > 0 ? (
                        <>
                          <span className="text-decoration-line-through me-1">
                            {price.initialFormatted}
                          </span>
                          <span className="fw-bold">{price.finalFormatted}</span>
                          <span className="ms-1 text-success">-{price.discount}%</span>
                        </>
                      ) : (
                        <span>{price.finalFormatted}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {app.Online && app.Online.length > 0 && (
              <>
                <CardHeader>Онлайн 🤼</CardHeader>
                <ul className="list-group list-group-flush mb-3">
                  {app.Online.map((online) => (
                    <li
                      key={online.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <span className="text-muted">
                        {moment(online.createdAt).format(DateTimeFormat)}
                      </span>
                      <div className="d-flex gap-1 align-items-center">
                        <span>{online.value.toLocaleString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </Col>
      </Row>

      <h3 className="mb-3">Related Apps</h3>
      {isErrorRelated ? (
        <Alert color="danger">Error loading related apps. Please try again later.</Alert>
      ) : relatedApps && relatedApps.length > 0 ? (
        <AppList apps={relatedApps} />
      ) : (
        <Alert color="info">No related apps found.</Alert>
      )}
    </div>
  );
}

export default AppDetail;
