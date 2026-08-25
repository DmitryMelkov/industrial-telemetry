import 'hammerjs';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initTheme } from './app/core/theme/theme.utils';

initTheme();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
