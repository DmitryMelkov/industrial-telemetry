import LogoutIcon from '@mui/icons-material/Logout';
import { AppBar, Button, Container, Toolbar, Typography } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { NavLink, Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { authStore, useLogout } from '@features/auth';
import { AppSnackbar } from '@features/feedback';
import { ThemeToggle } from '@features/theme';

const ShellRoot = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.palette.background.default};
`;

const HeaderBar = styled(AppBar).attrs({
  position: 'sticky',
  color: 'inherit',
  elevation: 0,
})`
  && {
    border-bottom: 1px solid ${({ theme }) => theme.palette.divider};
  }
`;

const Brand = styled(Typography).attrs({ variant: 'h6', color: 'primary' })`
  && {
    font-weight: 700;
    letter-spacing: -0.02em;
    margin-right: 24px;
    white-space: nowrap;
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-grow: 1;
`;

const ShellLink = styled(NavLink)`
  text-decoration: none;
  color: ${({ theme }) => theme.palette.text.secondary};
  font-weight: 600;
  font-size: 0.875rem;
  padding: 6px 12px;
  border-radius: 6px;

  &.active {
    color: ${({ theme }) => theme.palette.primary.main};
    background: ${({ theme }) => theme.palette.action.hover};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Main = styled(Container).attrs({ maxWidth: 'lg' })`
  && {
    padding-top: 32px;
    padding-bottom: 32px;
  }
`;

export const AdminShell = observer(function AdminShell() {
  const logoutMutation = useLogout();

  return (
    <ShellRoot>
      <HeaderBar>
        <Toolbar>
          <Brand>Telemetry Admin</Brand>
          <Nav>
            <ShellLink to="/" end>
              Главная
            </ShellLink>
            <ShellLink to="/sites">Объекты</ShellLink>
            <ShellLink to="/sensors">Датчики</ShellLink>
            <ShellLink to="/alerts">Алерты</ShellLink>
            <ShellLink to="/users">Пользователи</ShellLink>
          </Nav>
          <HeaderActions>
            <Typography variant="body2" color="text.secondary">
              {authStore.user?.email}
            </Typography>
            <ThemeToggle />
            <Button
              startIcon={<LogoutIcon />}
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              size="small"
            >
              Выйти
            </Button>
          </HeaderActions>
        </Toolbar>
      </HeaderBar>
      <Main>
        <Outlet />
      </Main>
      <AppSnackbar />
    </ShellRoot>
  );
});
