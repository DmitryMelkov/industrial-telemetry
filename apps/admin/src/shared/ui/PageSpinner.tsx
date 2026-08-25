import { CircularProgress } from '@mui/material';
import styled from 'styled-components';

const Root = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

export function PageSpinner() {
  return (
    <Root>
      <CircularProgress />
    </Root>
  );
}
