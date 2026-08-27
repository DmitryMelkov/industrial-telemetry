import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { IconButton } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { themeStore } from '../model/theme.store';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const ToggleButton = styled(IconButton)<{ $animating: boolean }>`
  && .MuiSvgIcon-root {
    ${({ $animating }) =>
      $animating
        ? css`
            animation: ${spin} 0.6s ease-in-out;
          `
        : null}
  }
`;

export const ThemeToggle = observer(function ThemeToggle() {
  const [animating, setAnimating] = useState(false);

  const handleToggle = () => {
    setAnimating(true);
    themeStore.toggle();
    window.setTimeout(() => setAnimating(false), 600);
  };

  return (
    <ToggleButton
      aria-label="Переключить тему"
      onClick={handleToggle}
      size="small"
      $animating={animating}
    >
      {themeStore.mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
    </ToggleButton>
  );
});
