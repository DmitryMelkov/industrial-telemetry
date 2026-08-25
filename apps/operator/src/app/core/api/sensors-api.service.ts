import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';
import { SensorDetailResponse } from '../../shared/types/api.types';

@Injectable({ providedIn: 'root' })
export class SensorsApiService {
  private readonly http = inject(HttpClient);

  getSensor = (sensorId: string): Observable<SensorDetailResponse> =>
    this.http.get<SensorDetailResponse>(`${environment.apiUrl}/api/sensors/${sensorId}`);
}
