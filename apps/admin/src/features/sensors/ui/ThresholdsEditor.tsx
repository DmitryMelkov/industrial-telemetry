import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import {
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import type { AlertSeverity, SensorThreshold, ThresholdInput } from '@entities/sensor';
import { SEVERITY_OPTIONS } from '../lib/labels';
import { decimalToInput, parseOptionalNumber } from '../lib/numbers';

interface ThresholdDraft {
  key: string;
  minValue: string;
  maxValue: string;
  severity: AlertSeverity;
}

interface ThresholdsEditorProps {
  initial: SensorThreshold[];
  isSubmitting: boolean;
  onSubmit: (thresholds: ThresholdInput[]) => void;
}

const Row = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr 1fr auto;
  gap: 12px;
  align-items: start;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

function toDraft(threshold: SensorThreshold): ThresholdDraft {
  return {
    key: threshold.id,
    minValue: decimalToInput(threshold.minValue),
    maxValue: decimalToInput(threshold.maxValue),
    severity: threshold.severity,
  };
}

function emptyDraft(): ThresholdDraft {
  return {
    key: crypto.randomUUID(),
    minValue: '',
    maxValue: '',
    severity: 'warning',
  };
}

export function ThresholdsEditor({ initial, isSubmitting, onSubmit }: ThresholdsEditorProps) {
  const [rows, setRows] = useState<ThresholdDraft[]>(
    initial.length > 0 ? initial.map(toDraft) : [emptyDraft()],
  );
  const [error, setError] = useState('');

  const updateRow = (key: string, patch: Partial<ThresholdDraft>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const thresholds = rows
        .map((row) => ({
          minValue: parseOptionalNumber(row.minValue),
          maxValue: parseOptionalNumber(row.maxValue),
          severity: row.severity,
        }))
        .filter((row) => row.minValue !== null || row.maxValue !== null);

      onSubmit(thresholds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Проверьте числа в порогах');
    }
  };

  return (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
      <Typography variant="h6">Пороги</Typography>
      <Typography variant="body2" color="text.secondary">
        Пустые min/max сохраняются как отсутствие границы. Строки без обоих значений отбрасываются.
      </Typography>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Порогов нет. Можно сохранить пустой список или добавить строку.
        </Typography>
      ) : null}

      {rows.map((row) => (
        <Row key={row.key}>
          <FormControl size="small">
            <InputLabel id={`severity-${row.key}`}>Severity</InputLabel>
            <Select
              labelId={`severity-${row.key}`}
              label="Severity"
              value={row.severity}
              onChange={(event) =>
                updateRow(row.key, { severity: event.target.value as AlertSeverity })
              }
            >
              {SEVERITY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Min"
            value={row.minValue}
            onChange={(event) => updateRow(row.key, { minValue: event.target.value })}
            inputMode="decimal"
          />
          <TextField
            label="Max"
            value={row.maxValue}
            onChange={(event) => updateRow(row.key, { maxValue: event.target.value })}
            inputMode="decimal"
          />
          <IconButton
            aria-label="Удалить порог"
            onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
          >
            <DeleteOutlinedIcon />
          </IconButton>
        </Row>
      ))}

      {error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : null}

      <Button
        type="button"
        startIcon={<AddIcon />}
        onClick={() => setRows((current) => [...current, emptyDraft()])}
      >
        Добавить порог
      </Button>

      <Actions>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : 'Сохранить пороги'}
        </Button>
      </Actions>
    </Stack>
  );
}
