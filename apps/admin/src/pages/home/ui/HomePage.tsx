import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined';
import { Alert, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { OutlinedPaper } from '@shared/ui/OutlinedPaper';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(OutlinedPaper)`
  display: flex;
  gap: 16px;
  align-items: flex-start;
`;

const CardIconSensors = styled(SensorsOutlinedIcon)`
  && {
    font-size: 40px;
    color: ${({ theme }) => theme.palette.primary.main};
    flex-shrink: 0;
  }
`;

const CardIconAlerts = styled(NotificationsActiveOutlinedIcon)`
  && {
    font-size: 40px;
    color: ${({ theme }) => theme.palette.primary.main};
    flex-shrink: 0;
  }
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
`;

export function HomePage() {
  return (
    <Page>
      <Typography variant="h4">Admin console</Typography>
      <Cards>
        <Card>
          <CardIconSensors />
          <CardBody>
            <Typography variant="h6">Датчики</Typography>
            <Typography color="text.secondary">
              Список, создание и редактирование датчиков, пороги min/max.
            </Typography>
            <Button component={Link} to="/sensors" variant="contained">
              Перейти к датчикам
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardIconAlerts />
          <CardBody>
            <Typography variant="h6">Алерты</Typography>
            <Typography color="text.secondary">
              Лента алертов с фильтрами и подтверждением (ack). Без realtime — только REST.
            </Typography>
            <Button component={Link} to="/alerts" variant="contained">
              Перейти к алертам
            </Button>
          </CardBody>
        </Card>
      </Cards>
      <Alert severity="info">
        Приложение ходит только в BFF через <code>/api/*</code> (cookie <code>it_session</code>).
      </Alert>
    </Page>
  );
}
