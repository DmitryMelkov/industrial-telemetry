import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';
import { SensorHistoryQuery, SensorHistoryResponse } from '../../shared/types/api.types';

@Injectable({ providedIn: 'root' })
export class HistoryApiService {
  private readonly http = inject(HttpClient);

  getHistory = (
    sensorId: string,
    query: SensorHistoryQuery = {},
  ): Observable<SensorHistoryResponse> =>
    this.http.get<SensorHistoryResponse>(`${environment.apiUrl}/api/sensors/${sensorId}/history`, {
      params: this.toParams(query),
    });

  private toParams = (query: SensorHistoryQuery): HttpParams => {
    let params = new HttpParams();
    if (query.from !== undefined && query.from !== '') {
      params = params.set('from', query.from);
    }
    if (query.to !== undefined && query.to !== '') {
      params = params.set('to', query.to);
    }
    if (query.limit !== undefined) {
      params = params.set('limit', String(query.limit));
    }
    return params;
  };
}
