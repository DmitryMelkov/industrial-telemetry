import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { IconButton } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { themeStore } from '../model/theme.store';

export const ThemeToggle = observer(function ThemeToggle() {
  return (
    <IconButton aria-label="Переключить тему" onClick={() => themeStore.toggle()} size="small">
      {themeStore.mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
    </IconButton>
  );
});
