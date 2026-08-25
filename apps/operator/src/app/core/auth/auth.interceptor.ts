import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const snackBar = inject(MatSnackBar);
  const requestWithCredentials = request.clone({ withCredentials: true });

  return next(requestWithCredentials).pipe(
    catchError((error: { status: number }) => {
      const isAuthProbe = request.url.endsWith('/auth/login') || request.url.endsWith('/auth/me');

      if (error.status === 401 && !isAuthProbe) {
        authService.clearSession();
        void router.navigate(['/login']);
      }

      if (error.status === 403) {
        snackBar.open('Нет доступа к этому ресурсу', 'Закрыть', {
          duration: 5000,
          panelClass: 'snackbar--error',
        });
      }

      return throwError(() => error);
    }),
  );
};
