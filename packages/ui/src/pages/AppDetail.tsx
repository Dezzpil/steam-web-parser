import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  CardText,
  Badge,
  Button,
  Spinner,
  Alert,
} from 'reactstrap';
import { fetchAppById, fetchRelatedApps } from '@/api/api';

function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const appId = parseInt(id || '0');

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
      <div className="mb-4">
        <Button color="secondary" tag={Link} to="/">
          &larr; Back to Apps
        </Button>
      </div>

      <Card className="mb-4">
        <CardBody>
          <CardTitle tag="h2">{app.title}</CardTitle>
          <div className="mb-3">
            <Button
              color="success"
              href={`https://store.steampowered.com/app/${app.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Steam
            </Button>
          </div>
          <CardText>{app.description}</CardText>

          <h5 className="mt-4">Genres</h5>
          <div className="mb-3">
            {app.genre.map((genre) => (
              <Badge key={genre} color="primary" className="tag-badge">
                {genre}
              </Badge>
            ))}
          </div>

          <h5>Popular Tags</h5>
          <div>
            {app.popularTags.map((tag) => (
              <Badge key={tag} color="secondary" className="tag-badge">
                {tag}
              </Badge>
            ))}
          </div>
        </CardBody>
      </Card>

      <h3 className="mb-3">Related Apps</h3>
      {isErrorRelated ? (
        <Alert color="danger">Error loading related apps. Please try again later.</Alert>
      ) : relatedApps && relatedApps.length > 0 ? (
        <Row>
          {relatedApps.map((relatedApp) => (
            <Col key={relatedApp.id} md={4} className="mb-4">
              <Card className="app-card">
                <CardBody>
                  <CardTitle tag="h5">
                    <Link to={`/app/${relatedApp.id}`}>{relatedApp.title}</Link>
                  </CardTitle>
                  <CardText>
                    {relatedApp.description.length > 100
                      ? `${relatedApp.description.substring(0, 100)}...`
                      : relatedApp.description}
                  </CardText>
                  <div>
                    {relatedApp.genre.slice(0, 2).map((genre) => (
                      <Badge key={genre} color="primary" className="tag-badge">
                        {genre}
                      </Badge>
                    ))}
                    {relatedApp.popularTags.slice(0, 2).map((tag) => (
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
      ) : (
        <Alert color="info">No related apps found.</Alert>
      )}
    </div>
  );
}

export default AppDetail;
