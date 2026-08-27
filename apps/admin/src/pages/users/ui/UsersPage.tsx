import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  TextField,
  Typography,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import type { ManagedUser, UserRole } from '@entities/user';
import { snackbarStore } from '@features/feedback';
import { useCreateUserMutation, useUpdateUserMutation, useUsersQuery } from '@features/users';
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

const ROLE_LABEL: Record<UserRole, string> = {
  operator: 'Operator',
  admin: 'Admin',
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ru-RU');
}

export function UsersPage() {
  const usersQuery = useUsersQuery();
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('operator');

  const users = usersQuery.data ?? [];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setRole('operator');
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (user: ManagedUser) => {
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setEditUser(user);
  };

  const closeDialogs = () => {
    setCreateOpen(false);
    setEditUser(null);
    resetForm();
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate(
      { email: email.trim(), password, role },
      {
        onSuccess: (user) => {
          snackbarStore.show(`Пользователь ${user.email} создан`, 'success');
          closeDialogs();
        },
        onError: (error) => {
          snackbarStore.show(getApiErrorMessage(error, 'Не удалось создать пользователя'), 'error');
        },
      },
    );
  };

  const handleUpdate = (event: FormEvent) => {
    event.preventDefault();
    if (!editUser) {
      return;
    }

    const payload: { email?: string; password?: string; role?: UserRole } = {
      email: email.trim(),
      role,
    };
    if (password.length > 0) {
      payload.password = password;
    }

    updateMutation.mutate(
      { id: editUser.id, payload },
      {
        onSuccess: (user) => {
          snackbarStore.show(`Пользователь ${user.email} обновлён`, 'success');
          closeDialogs();
        },
        onError: (error) => {
          snackbarStore.show(
            getApiErrorMessage(error, 'Не удалось обновить пользователя'),
            'error',
          );
        },
      },
    );
  };

  if (usersQuery.isPending) {
    return <PageSpinner />;
  }

  return (
    <Page>
      <Header>
        <Typography variant="h4">Пользователи</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Создать пользователя
        </Button>
      </Header>

      {usersQuery.error ? (
        <Alert
          severity={isForbiddenError(usersQuery.error) ? 'warning' : 'error'}
          action={
            <Button color="inherit" size="small" onClick={() => void usersQuery.refetch()}>
              Повторить
            </Button>
          }
        >
          {getApiErrorMessage(usersQuery.error, 'Не удалось загрузить пользователей')}
        </Alert>
      ) : null}

      {!usersQuery.error && users.length === 0 ? (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={openCreate}>
              Создать
            </Button>
          }
        >
          Нет пользователей — создайте первого.
        </Alert>
      ) : null}

      {users.length > 0 ? (
        <TableWrap>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell>Создан</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{ROLE_LABEL[user.role]}</TableCell>
                    <TableCell>{formatCreatedAt(user.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openEdit(user)}>
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

      <Dialog open={createOpen} onClose={() => !isSaving && closeDialogs()} fullWidth maxWidth="xs">
        {' '}
        <DialogTitle>Новый пользователь</DialogTitle>
        <form onSubmit={handleCreate}>
          <DialogContent>
            <DialogFields>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
                autoComplete="off"
              />
              <TextField
                label="Пароль"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                helperText="Минимум 8 символов"
                autoComplete="new-password"
              />
              <FormControl required>
                <InputLabel id="create-user-role-label">Роль</InputLabel>
                <Select
                  labelId="create-user-role-label"
                  label="Роль"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  <MenuItem value="operator">Operator</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </DialogFields>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialogs} disabled={isSaving}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {createMutation.isPending ? 'Создание…' : 'Создать'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={editUser !== null}
        onClose={() => !isSaving && closeDialogs()}
        fullWidth
        maxWidth="xs"
      >
        {' '}
        <DialogTitle>Изменить пользователя</DialogTitle>
        <form onSubmit={handleUpdate}>
          <DialogContent>
            <DialogFields>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
                autoComplete="off"
              />
              <TextField
                label="Новый пароль"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                helperText="Оставьте пустым, чтобы не менять"
                autoComplete="new-password"
              />
              <FormControl required>
                <InputLabel id="edit-user-role-label">Роль</InputLabel>
                <Select
                  labelId="edit-user-role-label"
                  label="Роль"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  <MenuItem value="operator">Operator</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </DialogFields>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialogs} disabled={isSaving}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {updateMutation.isPending ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Page>
  );
}
