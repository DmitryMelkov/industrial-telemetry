import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { Button, Typography } from '@mui/material';
import { observer } from 'mobx-react-lite';
import styled from 'styled-components';
import { authStore, useLogout } from '@features/auth';
import { OutlinedPaper } from '@shared/ui/OutlinedPaper';

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${({ theme }) => theme.palette.background.default};
`;

const Card = styled(OutlinedPaper)`
  max-width: 480px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
`;

const DenyIcon = styled(BlockOutlinedIcon)`
  && {
    font-size: 48px;
    color: ${({ theme }) => theme.palette.error.main};
  }
`;

export const ForbiddenPage = observer(function ForbiddenPage() {
  const logoutMutation = useLogout();

  return (
    <Page>
      <Card>
        <DenyIcon />
        <Typography variant="h5">Доступ запрещён</Typography>
        <Typography color="text.secondary">
          Для Admin console нужна роль <strong>admin</strong>. Текущая роль:{' '}
          <strong>{authStore.user?.role ?? '—'}</strong> ({authStore.user?.email}).
        </Typography>
        <Button
          variant="contained"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          Выйти и войти другим пользователем
        </Button>
      </Card>
    </Page>
  );
});
