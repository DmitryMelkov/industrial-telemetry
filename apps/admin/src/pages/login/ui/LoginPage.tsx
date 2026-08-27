import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { observer } from 'mobx-react-lite';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { authApi } from '@entities/user';
import { authStore } from '@features/auth';
import { ThemeToggle } from '@features/theme';
import { OutlinedPaper } from '@shared/ui/OutlinedPaper';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: ${({ theme }) =>
    theme.palette.mode === 'light'
      ? `linear-gradient(160deg, #e6f4ff 0%, ${theme.palette.background.default} 45%, ${theme.palette.background.paper} 100%)`
      : `linear-gradient(160deg, #0d1b2a 0%, ${theme.palette.background.default} 50%, ${theme.palette.background.paper} 100%)`};
`;

const TopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
`;

const BrandRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const BrandMark = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.palette.primary.main};
  color: #fff;
  flex-shrink: 0;
`;

const FormCard = styled(OutlinedPaper)`
  width: 100%;
`;

export const LoginPage = observer(function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@telemetry.local');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user }) => {
      authStore.setUser(user);
      navigate(user.role === 'admin' ? '/' : '/forbidden', { replace: true });
    },
    onError: (err: unknown) => {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError('Неверный email или пароль');
        return;
      }
      setError('Не удалось войти. Проверьте, что BFF запущен на :3000');
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <Page>
      <Container maxWidth="xs">
        <TopBar>
          <ThemeToggle />
        </TopBar>

        <FormCard>
          <Stack spacing={3} component="form" onSubmit={onSubmit}>
            <BrandRow>
              <BrandMark>
                <LockOutlinedIcon />
              </BrandMark>
              <div>
                <Typography variant="h5">Telemetry Admin</Typography>
                <Typography variant="body2" color="text.secondary">
                  Вход для администраторов
                </Typography>
              </div>
            </BrandRow>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <TextField
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Показать пароль"
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Вход…' : 'Войти'}
            </Button>
          </Stack>
        </FormCard>
      </Container>
    </Page>
  );
});
