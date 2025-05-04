import React from 'react';
import { Row, Col } from 'reactstrap';
import { App } from '@/api/types';
import AppCard from './AppCard';

interface AppListProps {
  apps: App[];
  colSize?: number;
}

const AppList: React.FC<AppListProps> = ({ apps, colSize = 4 }) => {
  return (
    <Row>
      {apps.map((app) => (
        <Col key={app.id} md={colSize} className="mb-4">
          <AppCard app={app} />
        </Col>
      ))}
    </Row>
  );
};

export default AppList;
