import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { SitesApiService } from '../api/sites-api.service';
import { DEMO_SITE_ID, OPERATOR_SITE_STORAGE_KEY } from '../config/demo-site';
import { RealtimeService } from '../realtime/realtime.service';
import { Site } from '../../shared/types/api.types';
import { resolveSelectedSiteId } from './resolve-selected-site-id';

@Injectable({ providedIn: 'root' })
export class SelectedSiteService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sitesApiService = inject(SitesApiService);
  private readonly realtimeService = inject(RealtimeService);
  private readonly sitesState = signal<Site[]>([]);
  private readonly siteIdState = signal('');
  private loadStarted = false;

  readonly sites = this.sitesState.asReadonly();
  readonly siteId = this.siteIdState.asReadonly();
  readonly selectedSite = computed(
    () => this.sitesState().find((site) => site.id === this.siteIdState()) ?? null,
  );
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly hasSites = computed(() => this.sitesState().length > 0);

  readonly ensureLoaded = (): void => {
    if (this.loadStarted) {
      return;
    }

    this.loadStarted = true;
    this.reloadSites();
  };

  readonly reloadSites = (): void => {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.sitesApiService.listSites().subscribe({
      next: (sites) => {
        this.sitesState.set(sites);
        const nextId = resolveSelectedSiteId(sites, this.readStoredId(), DEMO_SITE_ID);
        this.applySiteId(nextId ?? '', { connect: true, persist: Boolean(nextId) });
        this.isLoading.set(false);
      },
      error: () => {
        this.sitesState.set([]);
        this.siteIdState.set('');
        this.errorMessage.set('Не удалось загрузить список объектов.');
        this.isLoading.set(false);
      },
    });
  };

  readonly selectSite = (siteId: string): void => {
    if (siteId === this.siteIdState()) {
      return;
    }

    if (!this.sitesState().some((site) => site.id === siteId)) {
      return;
    }

    this.applySiteId(siteId, { connect: true, persist: true });
  };

  private applySiteId(siteId: string, options: { connect: boolean; persist: boolean }): void {
    this.siteIdState.set(siteId);

    if (options.persist && siteId) {
      this.writeStoredId(siteId);
    }

    if (options.connect && siteId) {
      this.realtimeService.connect(siteId);
    }
  }

  private readStoredId(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return window.localStorage.getItem(OPERATOR_SITE_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private writeStoredId(siteId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      window.localStorage.setItem(OPERATOR_SITE_STORAGE_KEY, siteId);
    } catch {
      // Ignore quota / private mode failures.
    }
  }
}
