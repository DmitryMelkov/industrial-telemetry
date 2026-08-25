import { makeAutoObservable, runInAction } from 'mobx';

export type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export class SnackbarStore {
  open = false;
  message = '';
  severity: SnackbarSeverity = 'success';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  show(message: string, severity: SnackbarSeverity = 'success'): void {
    this.message = message;
    this.severity = severity;
    this.open = true;
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
      runInAction(() => {
        this.open = false;
        hideTimer = null;
      });
    }, 4000);
  }

  close(): void {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    this.open = false;
  }
}

export const snackbarStore = new SnackbarStore();
