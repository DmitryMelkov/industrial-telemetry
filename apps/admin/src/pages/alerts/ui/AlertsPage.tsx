import RefreshIcon from '@mui/icons-material/Refresh';
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
import {
  PERIOD_FILTERS,
  SEVERITY_FILTERS,
  STATUS_FILTERS,
  formatAlertValue,
  formatOpenedAt,
  resolveAlertsPeriod,
  severityLabel,
  statusLabel,
  useAckAlertMutation,
  useAlertsQuery,
  type AlertsPeriodFilter,
} from '@features/alerts';
import { snackbarStore } from '@features/feedback';
import { useSitesQuery } from '@features/sensors';
import { getApiErrorMessage, isForbiddenError } from '@shared/lib/apiError';
import { OutlinedPaper } from '@shared/ui/OutlinedPaper';
import { PageSpinner } from '@shared/ui/PageSpinner';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const TableWrap = styled(OutlinedPaper)`
  padding: 0;
  overflow: auto;
`;

const Filters = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(140px, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

function isPeriodFilter(value: string): value is AlertsPeriodFilter {
  return value === 'all' || value === '1h' || value === '6h' || value === '24h';
}

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

export function AlertsPage() {
  const [params, setParams] = useSearchParams();
  const siteId = params.get('siteId') ?? '';
  const status = (params.get('status') ?? '') as AlertStatus | '';
  const severity = (params.get('severity') ?? '') as AlertSeverity | '';
  const periodParam = params.get('period') ?? 'all';
  const period: AlertsPeriodFilter = isPeriodFilter(periodParam) ? periodParam : 'all';
  const periodBounds = useMemo(() => resolveAlertsPeriod(period), [period]);

  const sitesQuery = useSitesQuery();
  const alertsQuery = useAlertsQuery({
    siteId: siteId || undefined,
    status: status || undefined,
    severity: severity || undefined,
    from: periodBounds.from,
    to: periodBounds.to,
  });
  const ackMutation = useAckAlertMutation();

  const sites = sitesQuery.data ?? [];

  const setFilter = (key: 'siteId' | 'status' | 'severity' | 'period', value: string) => {
    const next = new URLSearchParams(params);
    if (value && !(key === 'period' && value === 'all')) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const handleAck = (id: string) => {
    ackMutation.mutate(id, {
      onSuccess: () => {
        snackbarStore.show('Алерт подтверждён', 'success');
      },
      onError: (error) => {
        snackbarStore.show(getApiErrorMessage(error, 'Не удалось подтвердить алерт'), 'error');
      },
    });
  };

  const error = sitesQuery.error ?? alertsQuery.error;

  if (sitesQuery.isPending || alertsQuery.isPending) {
    return <PageSpinner />;
  }

  return (
    <Page>
      <Header>
        <Typography variant="h4">Журнал алертов</Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={() => {
            void alertsQuery.refetch();
          }}
          disabled={alertsQuery.isFetching}
        >
          Обновить
        </Button>
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
                void alertsQuery.refetch();
              }}
            >
              Повторить
            </Button>
          }
        >
          {getApiErrorMessage(error, 'Не удалось загрузить алерты')}
        </Alert>
      ) : null}

      <OutlinedPaper>
        <Filters>
          <FormControl>
            <InputLabel id="filter-alert-site">Объект</InputLabel>
            <Select
              labelId="filter-alert-site"
              label="Объект"
              value={siteId}
              onChange={(event) => setFilter('siteId', event.target.value)}
            >
              <MenuItem value="">Все объекты</MenuItem>
              {sites.map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.name} ({site.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel id="filter-alert-status">Статус</InputLabel>
            <Select
              labelId="filter-alert-status"
              label="Статус"
              value={status}
              onChange={(event) => setFilter('status', event.target.value)}
            >
              {STATUS_FILTERS.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel id="filter-alert-severity">Уровень</InputLabel>
            <Select
              labelId="filter-alert-severity"
              label="Уровень"
              value={severity}
              onChange={(event) => setFilter('severity', event.target.value)}
            >
              {SEVERITY_FILTERS.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel id="filter-alert-period">Период</InputLabel>
            <Select
              labelId="filter-alert-period"
              label="Период"
              value={period}
              onChange={(event) => setFilter('period', event.target.value)}
            >
              {PERIOD_FILTERS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Filters>
      </OutlinedPaper>

      {!error && (alertsQuery.data?.length ?? 0) === 0 ? (
        <Alert severity="info">
          Алерты не найдены. Измените фильтр или дождитесь новых событий.
        </Alert>
      ) : null}

      {(alertsQuery.data?.length ?? 0) > 0 ? (
        <TableWrap>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Opened</TableCell>
                  <TableCell>Датчик</TableCell>
                  <TableCell>Уровень</TableCell>
                  <TableCell>Сообщение</TableCell>
                  <TableCell>Значение</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {alertsQuery.data?.map((alert) => {
                  const isAcking = ackMutation.isPending && ackMutation.variables === alert.id;

                  return (
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
                        <Typography variant="caption" color="text.secondary" component="div">
                          {alert.sensor.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={severityLabel(alert.severity)}
                          color={severityColor(alert.severity)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{alert.message}</TableCell>
                      <TableCell>
                        {formatAlertValue(alert.value)} {alert.sensor.unit}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel(alert.status)}
                          color={statusColor(alert.status)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {alert.status === 'open' ? (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={isAcking}
                            onClick={() => handleAck(alert.id)}
                          >
                            {isAcking ? '…' : 'Ack'}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TableWrap>
      ) : null}
    </Page>
  );
}
