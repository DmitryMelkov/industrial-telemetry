import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { snackbarStore } from '@features/feedback';
import { useCreateSiteMutation, useSitesQuery } from '@features/sites';
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

export function SitesPage() {
  const sitesQuery = useSitesQuery();
  const createMutation = useCreateSiteMutation();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const sites = sitesQuery.data ?? [];

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate(
      { code: code.trim(), name: name.trim() },
      {
        onSuccess: (site) => {
          snackbarStore.show(`Объект ${site.code} создан`, 'success');
          setOpen(false);
          setCode('');
          setName('');
        },
        onError: (error) => {
          snackbarStore.show(getApiErrorMessage(error, 'Не удалось создать объект'), 'error');
        },
      },
    );
  };

  if (sitesQuery.isPending) {
    return <PageSpinner />;
  }

  return (
    <Page>
      <Header>
        <Typography variant="h4">Объекты</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Создать объект
        </Button>
      </Header>

      {sitesQuery.error ? (
        <Alert
          severity={isForbiddenError(sitesQuery.error) ? 'warning' : 'error'}
          action={
            <Button color="inherit" size="small" onClick={() => void sitesQuery.refetch()}>
              Повторить
            </Button>
          }
        >
          {getApiErrorMessage(sitesQuery.error, 'Не удалось загрузить объекты')}
        </Alert>
      ) : null}

      {!sitesQuery.error && sites.length === 0 ? (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={() => setOpen(true)}>
              Создать
            </Button>
          }
        >
          Нет объектов — создайте первый.
        </Alert>
      ) : null}

      {sites.length > 0 ? (
        <TableWrap>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Код</TableCell>
                  <TableCell>Название</TableCell>
                  <TableCell>Линий</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id} hover>
                    <TableCell>{site.code}</TableCell>
                    <TableCell>{site.name}</TableCell>
                    <TableCell>{site.lines.length}</TableCell>
                    <TableCell align="right">
                      <Button component={Link} to={`/sites/${site.id}`} size="small">
                        Открыть
                      </Button>
                      <Button
                        component={Link}
                        to={`/sensors?siteId=${encodeURIComponent(site.id)}`}
                        size="small"
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
      ) : null}

      <Dialog
        open={open}
        onClose={() => !createMutation.isPending && setOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Новый объект</DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent>
            <DialogFields>
              <TextField
                label="Код"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                autoFocus
                autoComplete="off"
              />
              <TextField
                label="Название"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="off"
              />
            </DialogFields>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} disabled={createMutation.isPending}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание…' : 'Создать'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Page>
  );
}
