import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardTitle, CardText, Badge } from 'reactstrap';
import { App } from '@/api/types';

interface AppCardProps {
  app: App;
}

const AppCard: React.FC<AppCardProps> = ({ app }) => {
  return (
    <Card className="app-card">
      <img src={app.linkToLogoImg} alt={`${app.title} logo`} className="img-fluid app-logo" />
      <div>
        <div className={'d-flex gap-2'} style={{ marginTop: -32, marginLeft: 16 }}>
          <Badge color="info" className="tag-badge">
            {app.isDownloadableContent ? <code>Доп. контент</code> : <span>Приложение</span>}
          </Badge>
          <Badge className="tag-badge">
            {app.Price && app.Price.length > 0 ? (
              <span>{app.Price[0].finalFormatted}</span>
            ) : (
              <span>Бесплатная</span>
            )}
          </Badge>
        </div>
      </div>
      <CardBody>
        <CardTitle tag="h5">
          <Link to={`/app/${app.id}`}>{app.title}</Link>
        </CardTitle>
        <CardText>
          <small>{app.descriptionMini}</small>
        </CardText>
        <div>
          {app.Online &&
            app.Online.slice(0, 3).map((online) => (
              <Badge key={online.id} color="warning" className="tag-badge">
                {online.value} игроков
              </Badge>
            ))}
          {app.categories.slice(0, 3).map((cat) => (
            <Badge key={cat} color="secondary" className="tag-badge">
              {cat}
            </Badge>
          ))}
          {app.genre.slice(0, 3).map((genre) => (
            <Badge key={genre} color="primary" className="tag-badge">
              {genre}
            </Badge>
          ))}
          {app.popularTags.slice(0, 6).map((tag) => (
            <Badge key={tag} color="success" className="tag-badge">
              {tag}
            </Badge>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default AppCard;
