import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ChartsService } from '../../charts.service';
import { ChartsSensorPanelComponent } from '../sensor-panel/charts-sensor-panel.component';
import { TimeSeriesChartComponent } from '../time-series-chart/time-series-chart.component';

export interface ChartsFullscreenData {
  chartsService: ChartsService;
}

@Component({
  selector: 'app-charts-fullscreen-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    ChartsSensorPanelComponent,
    TimeSeriesChartComponent,
  ],
  templateUrl: './charts-fullscreen-dialog.component.html',
  styleUrl: './charts-fullscreen-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsFullscreenDialogComponent {
  readonly data = inject<ChartsFullscreenData>(MAT_DIALOG_DATA);
  readonly chartsService = this.data.chartsService;
  private readonly dialogRef = inject(MatDialogRef<ChartsFullscreenDialogComponent>);

  close = (): void => {
    this.dialogRef.close();
  };
}
