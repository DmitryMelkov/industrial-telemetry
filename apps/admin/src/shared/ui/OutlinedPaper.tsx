import { Paper } from '@mui/material';
import styled from 'styled-components';

export const OutlinedPaper = styled(Paper).attrs({ elevation: 0 })`
  padding: 32px;
  border: 1px solid ${({ theme }) => theme.palette.divider};
`;
