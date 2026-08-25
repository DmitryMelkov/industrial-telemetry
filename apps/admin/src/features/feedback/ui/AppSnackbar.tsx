import { Alert, Snackbar } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { snackbarStore } from '../model/snackbar.store';

export const AppSnackbar = observer(function AppSnackbar() {
  return (
    <Snackbar open={snackbarStore.open} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert severity={snackbarStore.severity} variant="filled">
        {snackbarStore.message}
      </Alert>
    </Snackbar>
  );
});
