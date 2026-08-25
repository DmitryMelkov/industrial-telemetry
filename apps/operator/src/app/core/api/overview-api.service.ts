import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';
import { SiteOverviewResponse } from '../../shared/types/api.types';

@Injectable({ providedIn: 'root' })
export class OverviewApiService {
  private readonly http = inject(HttpClient);

  getOverview = (siteId: string): Observable<SiteOverviewResponse> =>
    this.http.get<SiteOverviewResponse>(`${environment.apiUrl}/api/sites/${siteId}/overview`);
}
