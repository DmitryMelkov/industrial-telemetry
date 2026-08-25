import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { OverviewService } from './overview.service';

@Component({
  selector: 'app-overview',
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OverviewService],
})
export class OverviewComponent {
  readonly overviewService = inject(OverviewService);

  constructor() {
    this.overviewService.initialize();
  }
}
