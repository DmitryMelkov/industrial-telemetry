import { Alert, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { snackbarStore } from '@features/feedback';
import { defaultUnit, SensorForm, useCreateSensorMutation, useSitesQuery } from '@features/sensors';
import { getApiErrorMessage } from '@shared/lib/apiError';
import { OutlinedPaper } from '@shared/ui/OutlinedPaper';
import { PageSpinner } from '@shared/ui/PageSpinner';

const DEMO_SITE_ID = '11111111-1111-1111-1111-111111111111';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export function SensorCreatePage() {
  const navigate = useNavigate();
  const sitesQuery = useSitesQuery();
  const createMutation = useCreateSensorMutation();
  const sites = sitesQuery.data ?? [];
  const defaultSite = sites.find((site) => site.id === DEMO_SITE_ID) ?? sites[0];
  const defaultLine = defaultSite?.lines[0];

  if (sitesQuery.isPending) {
    return <PageSpinner />;
  }

  if (sitesQuery.error) {
    return (
      <Alert severity="error">
        {getApiErrorMessage(sitesQuery.error, 'Не удалось загрузить объекты')}
      </Alert>
    );
  }

  if (!defaultSite || !defaultLine) {
    return <Alert severity="info">Сначала нужен хотя бы один объект с линией.</Alert>;
  }

  return (
    <Page>
      <Typography variant="h4">Новый датчик</Typography>
      <OutlinedPaper>
        <SensorForm
          mode="create"
          sites={sites}
          initial={{
            siteId: defaultSite.id,
            lineId: defaultLine.id,
            code: '',
            name: '',
            metric: 'temperature',
            unit: defaultUnit('temperature'),
            isActive: true,
          }}
          isSubmitting={createMutation.isPending}
          submitLabel="Создать"
          onCancel={() => navigate('/sensors')}
          onSubmit={(values) => {
            createMutation.mutate(
              {
                lineId: values.lineId,
                code: values.code,
                name: values.name,
                metric: values.metric,
                unit: values.unit,
                isActive: values.isActive,
              },
              {
                onSuccess: (sensor) => {
                  snackbarStore.show(`Датчик ${sensor.code} создан`);
                  navigate(`/sensors/${sensor.id}/edit`);
                },
                onError: (err) => {
                  snackbarStore.show(getApiErrorMessage(err, 'Не удалось создать датчик'), 'error');
                },
              },
            );
          }}
        />
      </OutlinedPaper>
    </Page>
  );
}
