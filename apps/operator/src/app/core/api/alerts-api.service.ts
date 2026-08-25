import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';
import { AlertItem, AlertsListQuery } from '../../shared/types/api.types';

@Injectable({ providedIn: 'root' })
export class AlertsApiService {
  private readonly http = inject(HttpClient);

  listAlerts = (query: AlertsListQuery): Observable<AlertItem[]> =>
    this.http.get<AlertItem[]>(`${environment.apiUrl}/api/alerts`, {
      params: this.toParams(query),
    });

  ackAlert = (alertId: string): Observable<AlertItem> =>
    this.http.patch<AlertItem>(`${environment.apiUrl}/api/alerts/${alertId}/ack`, {});

  private toParams = (query: AlertsListQuery): HttpParams => {
    let params = new HttpParams().set('siteId', query.siteId);

    if (query.status !== undefined) {
      params = params.set('status', query.status);
    }

    if (query.severity !== undefined) {
      params = params.set('severity', query.severity);
    }

    if (query.from !== undefined && query.from !== '') {
      params = params.set('from', query.from);
    }

    if (query.to !== undefined && query.to !== '') {
      params = params.set('to', query.to);
    }

    if (query.limit !== undefined) {
      params = params.set('limit', String(query.limit));
    }

    if (query.offset !== undefined) {
      params = params.set('offset', String(query.offset));
    }

    return params;
  };
}
