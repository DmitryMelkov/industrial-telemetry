import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';
import { Site } from '../../shared/types/api.types';

@Injectable({ providedIn: 'root' })
export class SitesApiService {
  private readonly http = inject(HttpClient);

  listSites = (): Observable<Site[]> => this.http.get<Site[]>(`${environment.apiUrl}/api/sites`);
}
