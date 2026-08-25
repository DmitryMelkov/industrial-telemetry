import { CircularProgress } from '@mui/material';
import styled from 'styled-components';

const Root = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export function CenterSpinner() {
  return (
    <Root>
      <CircularProgress />
    </Root>
  );
}
