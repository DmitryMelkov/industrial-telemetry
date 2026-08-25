import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../config/environment';
import { LoginResponse, User } from '../../shared/types/api.types';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly realtimeService = inject(RealtimeService);
  readonly currentUser$ = new BehaviorSubject<User | null>(null);

  login = (email: string, password: string): Observable<User> =>
    this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, { email, password }).pipe(
      map((response) => response.user),
      tap((user) => this.currentUser$.next(user)),
    );

  clearSession = (): void => {
    this.realtimeService.disconnect();
    this.currentUser$.next(null);
  };

  logout = (): Observable<void> =>
    this.http
      .post<void>(`${environment.apiUrl}/api/auth/logout`, {})
      .pipe(tap(() => this.clearSession()));

  loadMe = (): Observable<User | null> =>
    this.http.get<User>(`${environment.apiUrl}/api/auth/me`).pipe(
      tap((user) => this.currentUser$.next(user)),
      catchError(() => {
        this.currentUser$.next(null);
        return of(null);
      }),
    );

  isAuthenticated = (): boolean => this.currentUser$.value !== null;
}
