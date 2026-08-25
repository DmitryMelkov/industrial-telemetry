import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Button,
  Chip,
  FormControl,
  InputLabel,
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
import type { SensorMetric } from '@entities/sensor';
import { metricLabel, useSensorsQuery, useSitesQuery } from '@features/sensors';
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
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 16px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const METRIC_FILTERS: Array<{ value: '' | SensorMetric; label: string }> = [
  { value: '', label: 'Все метрики' },
  { value: 'temperature', label: 'Температура' },
  { value: 'pressure', label: 'Давление' },
  { value: 'vibration', label: 'Вибрация' },
  { value: 'flow', label: 'Расход' },
];

export function SensorsPage() {
  const [params, setParams] = useSearchParams();
  const siteId = params.get('siteId') ?? '';
  const lineId = params.get('lineId') ?? '';
  const metric = (params.get('metric') ?? '') as SensorMetric | '';

  const sitesQuery = useSitesQuery();
  const sensorsQuery = useSensorsQuery({
    siteId: siteId || undefined,
    lineId: lineId || undefined,
    metric: metric || undefined,
  });

  const sites = sitesQuery.data ?? [];
  const selectedSite = sites.find((site) => site.id === siteId);
  const lines = selectedSite?.lines ?? [];

  const siteNameById = useMemo(
    () => new Map((sitesQuery.data ?? []).map((site) => [site.id, site.name])),
    [sitesQuery.data],
  );

  const setFilter = (key: 'siteId' | 'lineId' | 'metric', value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key === 'siteId') {
      next.delete('lineId');
    }
    setParams(next, { replace: true });
  };

  const error = sitesQuery.error ?? sensorsQuery.error;

  if (sitesQuery.isPending || sensorsQuery.isPending) {
    return <PageSpinner />;
  }

  return (
    <Page>
      <Header>
        <Typography variant="h4">Датчики</Typography>
        <Button component={Link} to="/sensors/new" variant="contained" startIcon={<AddIcon />}>
          Создать
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
                void sensorsQuery.refetch();
              }}
            >
              Повторить
            </Button>
          }
        >
          {getApiErrorMessage(error, 'Не удалось загрузить датчики')}
        </Alert>
      ) : null}

      <OutlinedPaper>
        <Filters>
          <FormControl>
            <InputLabel id="filter-site">Объект</InputLabel>
            <Select
              labelId="filter-site"
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

          <FormControl disabled={!siteId}>
            <InputLabel id="filter-line">Линия</InputLabel>
            <Select
              labelId="filter-line"
              label="Линия"
              value={lineId}
              onChange={(event) => setFilter('lineId', event.target.value)}
            >
              <MenuItem value="">Все линии</MenuItem>
              {lines.map((line) => (
                <MenuItem key={line.id} value={line.id}>
                  {line.name} ({line.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel id="filter-metric">Метрика</InputLabel>
            <Select
              labelId="filter-metric"
              label="Метрика"
              value={metric}
              onChange={(event) => setFilter('metric', event.target.value)}
            >
              {METRIC_FILTERS.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Filters>
      </OutlinedPaper>

      {!error && (sensorsQuery.data?.length ?? 0) === 0 ? (
        <Alert severity="info">Датчики не найдены. Измените фильтр или создайте новый.</Alert>
      ) : null}

      {(sensorsQuery.data?.length ?? 0) > 0 ? (
        <TableWrap>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Код</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Метрика</TableCell>
                  <TableCell>Ед.</TableCell>
                  <TableCell>Линия</TableCell>
                  <TableCell>Объект</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Пороги</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {sensorsQuery.data?.map((sensor) => (
                  <TableRow key={sensor.id} hover>
                    <TableCell>{sensor.code}</TableCell>
                    <TableCell>{sensor.name}</TableCell>
                    <TableCell>{metricLabel(sensor.metric)}</TableCell>
                    <TableCell>{sensor.unit}</TableCell>
                    <TableCell>{sensor.line.code}</TableCell>
                    <TableCell>{siteNameById.get(sensor.line.siteId) ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={sensor.isActive ? 'Активен' : 'Выключен'}
                        color={sensor.isActive ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{sensor.thresholds.length}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} to={`/sensors/${sensor.id}/edit`} size="small">
                        Изменить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TableWrap>
      ) : null}
    </Page>
  );
}
