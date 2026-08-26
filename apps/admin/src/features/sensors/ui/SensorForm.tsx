import {
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useMemo, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import type { SensorMetric } from '@entities/sensor';
import type { Site } from '@entities/site';
import { defaultUnit, METRIC_OPTIONS } from '../lib/labels';

export interface SensorFormValues {
  siteId: string;
  lineId: string;
  code: string;
  name: string;
  metric: SensorMetric;
  unit: string;
  isActive: boolean;
}

interface SensorFormProps {
  mode: 'create' | 'edit';
  sites: Site[];
  initial: SensorFormValues;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (values: SensorFormValues) => void;
  onCancel: () => void;
}

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

export function SensorForm({
  mode,
  sites,
  initial,
  isSubmitting,
  submitLabel,
  onSubmit,
  onCancel,
}: SensorFormProps) {
  const [values, setValues] = useState<SensorFormValues>(initial);
  const isEdit = mode === 'edit';

  const lines = useMemo(() => {
    const site = sites.find((item) => item.id === values.siteId);
    return site?.lines ?? [];
  }, [sites, values.siteId]);

  const setField = <K extends keyof SensorFormValues>(key: K, value: SensorFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSiteChange = (siteId: string) => {
    const site = sites.find((item) => item.id === siteId);
    const nextLineId = site?.lines.some((line) => line.id === values.lineId)
      ? values.lineId
      : (site?.lines[0]?.id ?? '');
    setValues((current) => ({ ...current, siteId, lineId: nextLineId }));
  };

  const handleMetricChange = (metric: SensorMetric) => {
    setValues((current) => {
      const previousDefault = defaultUnit(current.metric);
      const nextUnit =
        current.unit === '' || current.unit === previousDefault
          ? defaultUnit(metric)
          : current.unit;
      return { ...current, metric, unit: nextUnit };
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      ...values,
      code: values.code.trim(),
      name: values.name.trim(),
      unit: values.unit.trim(),
    });
  };

  return (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
      <FormControl disabled={isEdit} required>
        <InputLabel id="sensor-site">Объект</InputLabel>
        <Select
          labelId="sensor-site"
          label="Объект"
          value={values.siteId}
          onChange={(event) => handleSiteChange(event.target.value)}
        >
          {sites.map((site) => (
            <MenuItem key={site.id} value={site.id}>
              {site.name} ({site.code})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl disabled={isEdit || !values.siteId} required>
        <InputLabel id="sensor-line">Линия</InputLabel>
        <Select
          labelId="sensor-line"
          label="Линия"
          value={values.lineId}
          onChange={(event) => setField('lineId', event.target.value)}
          displayEmpty
        >
          {lines.length === 0 ? (
            <MenuItem value="" disabled>
              Нет линий — создайте на странице объекта
            </MenuItem>
          ) : (
            lines.map((line) => (
              <MenuItem key={line.id} value={line.id}>
                {line.name} ({line.code})
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      <TextField
        label="Код"
        value={values.code}
        onChange={(event) => setField('code', event.target.value)}
        required
        autoComplete="off"
      />

      <TextField
        label="Название"
        value={values.name}
        onChange={(event) => setField('name', event.target.value)}
        required
        autoComplete="off"
      />

      <FormControl disabled={isEdit} required>
        <InputLabel id="sensor-metric">Метрика</InputLabel>
        <Select
          labelId="sensor-metric"
          label="Метрика"
          value={values.metric}
          onChange={(event) => handleMetricChange(event.target.value as SensorMetric)}
        >
          {METRIC_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Единица"
        value={values.unit}
        onChange={(event) => setField('unit', event.target.value)}
        required
        autoComplete="off"
      />

      <FormControlLabel
        control={
          <Switch
            checked={values.isActive}
            onChange={(event) => setField('isActive', event.target.checked)}
            color="primary"
          />
        }
        label={
          values.isActive
            ? 'Активен — участвует в генерации и мониторинге'
            : 'Выключен — generator/Operator могут перестать слать/показывать'
        }
      />

      <Actions>
        <Button type="button" onClick={onCancel} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : submitLabel}
        </Button>
      </Actions>
    </Stack>
  );
}
