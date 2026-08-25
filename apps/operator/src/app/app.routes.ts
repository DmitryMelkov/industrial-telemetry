import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { AlertsComponent } from './features/alerts/alerts.component';
import { ChartsComponent } from './features/charts/charts.component';
import { OverviewComponent } from './features/overview/overview.component';
import { ShellComponent } from './features/shell/shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OverviewComponent },
      { path: 'charts', component: ChartsComponent },
      { path: 'alerts', component: AlertsComponent },
    ],
  },
  { path: '**', redirectTo: 'overview' },
];
