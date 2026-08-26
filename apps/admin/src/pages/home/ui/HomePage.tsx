import AddIcon from '@mui/icons-material/Add';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import SensorsOutlinedIcon from '@mui/icons-material/SensorsOutlined';
import {
  Alert,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Link as MuiLink,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import type { AlertStatus } from '@entities/alert';
import type { AlertSeverity } from '@entities/sensor';
import { formatOpenedAt, severityLabel, statusLabel, useAlertsQuery } from '@features/alerts';
import { useSensorsQuery, useSitesQuery } from '@features/sensors';
import { getApiErrorMessage, isForbiddenError } from '@shared/lib/apiError';
import { OutlinedPaper } from '@shared/ui/OutlinedPaper';
import { PageSpinner } from '@shared/ui/PageSpinner';

const DEMO_SITE_ID = '11111111-1111-1111-1111-111111111111';
const RECENT_ALERTS_LIMIT = 8;
const KPI_ALERTS_LIMIT = 500;

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const KpiCard = styled(OutlinedPaper)`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const KpiValue = styled(Typography).attrs({ variant: 'h4' })`
  && {
    font-weight: 700;
    letter-spacing: -0.02em;
  }
`;

const Section = styled(OutlinedPaper)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const TableWrap = styled.div`
  overflow: auto;
  margin: 0 -20px -20px;
`;

function severityColor(severity: AlertSeverity): 'warning' | 'error' {
  return severity === 'critical' ? 'error' : 'warning';
}

function statusColor(status: AlertStatus): 'default' | 'warning' | 'info' | 'success' {
  switch (status) {
    case 'open':
      return 'warning';
    case 'acked':
      return 'info';
    case 'resolved':
      return 'success';
    default:
      return 'default';
  }
}

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const sitesQuery = useSitesQuery();
  const sites = sitesQuery.data ?? [];

  const siteId = useMemo(() => {
    const fromUrl = params.get('siteId');
    if (fromUrl) {
      return fromUrl;
    }
    const list = sitesQuery.data ?? [];
    if (list.some((site) => site.id === DEMO_SITE_ID)) {
      return DEMO_SITE_ID;
    }
    return list[0]?.id ?? '';
  }, [params, sitesQuery.data]);

  const sensorsQuery = useSensorsQuery({ siteId: siteId || undefined });
  const openAlertsQuery = useAlertsQuery({
    siteId: siteId || undefined,
    status: 'open',
    limit: KPI_ALERTS_LIMIT,
  });
  const ackedAlertsQuery = useAlertsQuery({
    siteId: siteId || undefined,
    status: 'acked',
    limit: KPI_ALERTS_LIMIT,
  });
  const recentAlertsQuery = useAlertsQuery({
    siteId: siteId || undefined,
    limit: RECENT_ALERTS_LIMIT,
  });

  const sensors = sensorsQuery.data ?? [];
  const activeCount = sensors.filter((sensor) => sensor.isActive).length;
  const openCount = openAlertsQuery.data?.length ?? 0;
  const ackedCount = ackedAlertsQuery.data?.length ?? 0;
  const recentAlerts = recentAlertsQuery.data ?? [];

  const isLoading =
    sitesQuery.isPending ||
    (Boolean(siteId) &&
      (sensorsQuery.isPending ||
        openAlertsQuery.isPending ||
        ackedAlertsQuery.isPending ||
        recentAlertsQuery.isPending));

  const error =
    sitesQuery.error ??
    sensorsQuery.error ??
    openAlertsQuery.error ??
    ackedAlertsQuery.error ??
    recentAlertsQuery.error;

  const sensorsNewTo = siteId
    ? `/sensors/new?siteId=${encodeURIComponent(siteId)}`
    : '/sensors/new';
  const alertsTo = siteId ? `/alerts?siteId=${encodeURIComponent(siteId)}` : '/alerts';

  if (isLoading) {
    return <PageSpinner />;
  }

  return (
    <Page>
      <Header>
        <div>
          <Typography variant="h4">Обзор</Typography>
          <Typography color="text.secondary">
            Компактный статус объекта: датчики и журнал алертов (без realtime).
          </Typography>
        </div>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel id="home-site">Объект</InputLabel>
          <Select
            labelId="home-site"
            label="Объект"
            value={siteId}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              if (event.target.value) {
                next.set('siteId', event.target.value);
              } else {
                next.delete('siteId');
              }
              setParams(next, { replace: true });
            }}
            disabled={sites.length === 0}
          >
            {sites.map((site) => (
              <MenuItem key={site.id} value={site.id}>
                {site.name} ({site.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Header>

      {error ? (
        <Alert
          severity={isForbiddenError(error) ? 'warning' : 'error'}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                void sitesQuery.refetch();
                void sensorsQuery.refetch();
                void openAlertsQuery.refetch();
                void ackedAlertsQuery.refetch();
                void recentAlertsQuery.refetch();
              }}
            >
              Повторить
            </Button>
          }
        >
          {getApiErrorMessage(error, 'Не удалось загрузить обзор')}
        </Alert>
      ) : null}

      {!error && !siteId ? (
        <Alert severity="info">Нет доступных объектов. Проверьте seed / права доступа.</Alert>
      ) : null}

      {!error && siteId ? (
        <>
          <KpiGrid>
            <KpiCard>
              <Typography color="text.secondary" variant="body2">
                Датчиков всего
              </Typography>
              <KpiValue>{sensors.length}</KpiValue>
            </KpiCard>
            <KpiCard>
              <Typography color="text.secondary" variant="body2">
                Активных
              </Typography>
              <KpiValue>{activeCount}</KpiValue>
            </KpiCard>
            <KpiCard>
              <Typography color="text.secondary" variant="body2">
                Открытые алерты
              </Typography>
              <KpiValue>{openCount}</KpiValue>
              <Typography variant="caption" color="text.secondary">
                до {KPI_ALERTS_LIMIT}
              </Typography>
            </KpiCard>
            <KpiCard>
              <Typography color="text.secondary" variant="body2">
                Подтверждённые
              </Typography>
              <KpiValue>{ackedCount}</KpiValue>
              <Typography variant="caption" color="text.secondary">
                до {KPI_ALERTS_LIMIT}
              </Typography>
            </KpiCard>
          </KpiGrid>

          <Actions>
            <Button component={Link} to={sensorsNewTo} variant="contained" startIcon={<AddIcon />}>
              Создать датчик
            </Button>
            <Button
              component={Link}
              to={alertsTo}
              variant="outlined"
              startIcon={<NotificationsActiveOutlinedIcon />}
            >
              Журнал алертов
            </Button>
            <Button component={Link} to="/sites" variant="text" startIcon={<DomainOutlinedIcon />}>
              Объекты
            </Button>
            <Button
              component={Link}
              to="/sensors"
              variant="text"
              startIcon={<SensorsOutlinedIcon />}
            >
              Все датчики
            </Button>
          </Actions>

          <Section>
            <SectionHeader>
              <Typography variant="h6">Последние алерты</Typography>
              <Button component={Link} to={alertsTo} size="small">
                Весь журнал
              </Button>
            </SectionHeader>

            {recentAlerts.length === 0 ? (
              <Alert severity="info">Пока нет алертов для выбранного объекта.</Alert>
            ) : (
              <TableWrap>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Время</TableCell>
                        <TableCell>Датчик</TableCell>
                        <TableCell>Уровень</TableCell>
                        <TableCell>Статус</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentAlerts.map((alert) => (
                        <TableRow key={alert.id} hover>
                          <TableCell>{formatOpenedAt(alert.openedAt)}</TableCell>
                          <TableCell>
                            <MuiLink
                              component={Link}
                              to={`/sensors/${alert.sensor.id}/edit`}
                              underline="hover"
                            >
                              {alert.sensor.code}
                            </MuiLink>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={severityLabel(alert.severity)}
                              color={severityColor(alert.severity)}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={statusLabel(alert.status)}
                              color={statusColor(alert.status)}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TableWrap>
            )}
          </Section>
        </>
      ) : null}
    </Page>
  );
}
