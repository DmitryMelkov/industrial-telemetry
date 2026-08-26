import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import type { Site } from '@entities/site';
import { snackbarStore } from '@features/feedback';
import {
  useCreateLineMutation,
  useSitesQuery,
  useUpdateLineMutation,
  useUpdateSiteMutation,
} from '@features/sites';
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

const DialogFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: min(420px, 100%);
  padding-top: 8px;
`;

const BackRow = styled.div`
  margin-top: 8px;
`;

const SiteFormWrap = styled.div`
  max-width: 480px;
`;

const LinesEmpty = styled.div`
  margin-top: 16px;
`;

interface SiteParamsFormProps {
  site: Site;
  isSubmitting: boolean;
  onSubmit: (values: { code: string; name: string }) => void;
}

function SiteParamsForm({ site, isSubmitting, onSubmit }: SiteParamsFormProps) {
  const [code, setCode] = useState(site.code);
  const [name, setName] = useState(site.name);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ code: code.trim(), name: name.trim() });
  };

  return (
    <SiteFormWrap>
      <Stack spacing={2} component="form" onSubmit={handleSubmit}>
        <TextField
          label="Код"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
          autoComplete="off"
        />
        <TextField
          label="Название"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoComplete="off"
        />
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </Stack>
    </SiteFormWrap>
  );
}

export function SiteDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const sitesQuery = useSitesQuery();
  const site = useMemo(
    () => (sitesQuery.data ?? []).find((item) => item.id === id),
    [sitesQuery.data, id],
  );

  const updateSiteMutation = useUpdateSiteMutation(id);
  const createLineMutation = useCreateLineMutation(id);
  const updateLineMutation = useUpdateLineMutation();

  const [lineDialog, setLineDialog] = useState<'create' | { id: string } | null>(null);
  const [lineCode, setLineCode] = useState('');
  const [lineName, setLineName] = useState('');

  const openCreateLine = () => {
    setLineCode('');
    setLineName('');
    setLineDialog('create');
  };

  const openEditLine = (lineId: string, currentCode: string, currentName: string) => {
    setLineCode(currentCode);
    setLineName(currentName);
    setLineDialog({ id: lineId });
  };

  const handleSaveLine = (event: FormEvent) => {
    event.preventDefault();
    const payload = { code: lineCode.trim(), name: lineName.trim() };

    if (lineDialog === 'create') {
      createLineMutation.mutate(payload, {
        onSuccess: (line) => {
          snackbarStore.show(`Линия ${line.code} создана`, 'success');
          setLineDialog(null);
        },
        onError: (error) => {
          snackbarStore.show(getApiErrorMessage(error, 'Не удалось создать линию'), 'error');
        },
      });
      return;
    }

    if (lineDialog && typeof lineDialog === 'object') {
      updateLineMutation.mutate(
        { id: lineDialog.id, payload },
        {
          onSuccess: (line) => {
            snackbarStore.show(`Линия ${line.code} сохранена`, 'success');
            setLineDialog(null);
          },
          onError: (error) => {
            snackbarStore.show(getApiErrorMessage(error, 'Не удалось сохранить линию'), 'error');
          },
        },
      );
    }
  };

  const lineBusy = createLineMutation.isPending || updateLineMutation.isPending;

  if (sitesQuery.isPending) {
    return <PageSpinner />;
  }

  if (sitesQuery.error) {
    return (
      <Alert severity={isForbiddenError(sitesQuery.error) ? 'warning' : 'error'}>
        {getApiErrorMessage(sitesQuery.error, 'Не удалось загрузить объект')}
      </Alert>
    );
  }

  if (!site) {
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" component={Link} to="/sites">
            К списку
          </Button>
        }
      >
        Объект не найден.
      </Alert>
    );
  }

  return (
    <Page>
      <Header>
        <div>
          <Typography variant="h4">
            {site.code} — {site.name}
          </Typography>
          <BackRow>
            <Button component={Link} to="/sites" size="small">
              ← Все объекты
            </Button>
          </BackRow>
        </div>
        <Button
          component={Link}
          to={`/sensors?siteId=${encodeURIComponent(site.id)}`}
          variant="outlined"
        >
          Датчики объекта
        </Button>
      </Header>

      <OutlinedPaper>
        <Typography variant="h6" gutterBottom>
          Параметры объекта
        </Typography>
        <SiteParamsForm
          key={site.id}
          site={site}
          isSubmitting={updateSiteMutation.isPending}
          onSubmit={(values) => {
            updateSiteMutation.mutate(values, {
              onSuccess: (updated) => {
                snackbarStore.show(`Объект ${updated.code} сохранён`, 'success');
              },
              onError: (error) => {
                snackbarStore.show(
                  getApiErrorMessage(error, 'Не удалось сохранить объект'),
                  'error',
                );
              },
            });
          }}
        />
      </OutlinedPaper>

      <div>
        <Header>
          <Typography variant="h6">Линии</Typography>
          <Button startIcon={<AddIcon />} variant="contained" onClick={openCreateLine}>
            Создать линию
          </Button>
        </Header>

        {site.lines.length === 0 ? (
          <LinesEmpty>
            <Alert severity="info">Нет линий — создайте линию, затем датчик.</Alert>
          </LinesEmpty>
        ) : (
          <TableWrap style={{ marginTop: 16 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Код</TableCell>
                    <TableCell>Название</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {site.lines.map((line) => (
                    <TableRow key={line.id} hover>
                      <TableCell>{line.code}</TableCell>
                      <TableCell>{line.name}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => openEditLine(line.id, line.code, line.name)}
                        >
                          Изменить
                        </Button>
                        <Button
                          component={Link}
                          size="small"
                          to={`/sensors?siteId=${encodeURIComponent(site.id)}&lineId=${encodeURIComponent(line.id)}`}
                        >
                          Датчики
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TableWrap>
        )}
      </div>

      <Dialog
        open={lineDialog !== null}
        onClose={() => !lineBusy && setLineDialog(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{lineDialog === 'create' ? 'Новая линия' : 'Редактировать линию'}</DialogTitle>
        <form onSubmit={handleSaveLine}>
          <DialogContent>
            <DialogFields>
              <TextField
                label="Код"
                value={lineCode}
                onChange={(event) => setLineCode(event.target.value)}
                required
                autoFocus
                autoComplete="off"
              />
              <TextField
                label="Название"
                value={lineName}
                onChange={(event) => setLineName(event.target.value)}
                required
                autoComplete="off"
              />
            </DialogFields>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLineDialog(null)} disabled={lineBusy}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" disabled={lineBusy}>
              {lineBusy ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Page>
  );
}
