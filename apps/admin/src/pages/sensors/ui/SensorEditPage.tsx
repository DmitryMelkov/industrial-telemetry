import { Alert, Typography } from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { snackbarStore } from '@features/feedback';
import {
  SensorForm,
  ThresholdsEditor,
  useReplaceThresholdsMutation,
  useSensorQuery,
  useSitesQuery,
  useUpdateSensorMutation,
} from '@features/sensors';
import { getApiErrorMessage, isForbiddenError } from '@shared/lib/apiError';
import { OutlinedPaper } from '@shared/ui/OutlinedPaper';
import { PageSpinner } from '@shared/ui/PageSpinner';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export function SensorEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sitesQuery = useSitesQuery();
  const sensorQuery = useSensorQuery(id);
  const updateMutation = useUpdateSensorMutation(id ?? '');
  const thresholdsMutation = useReplaceThresholdsMutation(id ?? '');
  const backTo = `/sensors${params.toString() ? `?${params.toString()}` : ''}`;

  const sensor = sensorQuery.data;
  const sites = sitesQuery.data ?? [];

  if (sitesQuery.isPending || sensorQuery.isPending) {
    return <PageSpinner />;
  }

  const loadError = sitesQuery.error ?? sensorQuery.error;
  if (loadError || !sensor) {
    return (
      <Alert severity={isForbiddenError(loadError) ? 'warning' : 'error'}>
        {getApiErrorMessage(loadError, 'Не удалось загрузить датчик')}
      </Alert>
    );
  }

  return (
    <Page>
      <Typography variant="h4">
        {sensor.code} — {sensor.name}
      </Typography>

      <OutlinedPaper>
        <SensorForm
          mode="edit"
          sites={sites}
          initial={{
            siteId: sensor.line.siteId,
            lineId: sensor.lineId,
            code: sensor.code,
            name: sensor.name,
            metric: sensor.metric,
            unit: sensor.unit,
            isActive: sensor.isActive,
          }}
          isSubmitting={updateMutation.isPending}
          submitLabel="Сохранить"
          onCancel={() => navigate(backTo)}
          onSubmit={(values) => {
            updateMutation.mutate(
              {
                code: values.code,
                name: values.name,
                unit: values.unit,
                isActive: values.isActive,
              },
              {
                onSuccess: (updated) => {
                  snackbarStore.show(`Датчик ${updated.code} сохранён`);
                },
                onError: (err) => {
                  snackbarStore.show(
                    getApiErrorMessage(err, 'Не удалось сохранить датчик'),
                    'error',
                  );
                },
              },
            );
          }}
        />
      </OutlinedPaper>

      <OutlinedPaper>
        <ThresholdsEditor
          key={sensor.thresholds.map((item) => item.id).join('|')}
          initial={sensor.thresholds}
          isSubmitting={thresholdsMutation.isPending}
          onSubmit={(thresholds) => {
            thresholdsMutation.mutate(
              { thresholds },
              {
                onSuccess: () => {
                  snackbarStore.show('Пороги обновлены');
                },
                onError: (err) => {
                  snackbarStore.show(
                    getApiErrorMessage(err, 'Не удалось сохранить пороги'),
                    'error',
                  );
                },
              },
            );
          }}
        />
      </OutlinedPaper>
    </Page>
  );
}
