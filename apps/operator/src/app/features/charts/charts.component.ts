import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import {
  applyCalendarDate,
  applyClockTime,
  ChartRangePreset,
  fromDateOrNull,
  toDateOrNull,
} from './charts-range';
import { ChartsService } from './charts.service';
import { ChartsFullscreenDialogComponent } from './ui/fullscreen-dialog/charts-fullscreen-dialog.component';
import { ChartsSensorPanelComponent } from './ui/sensor-panel/charts-sensor-panel.component';
import { TimeSeriesChartComponent } from './ui/time-series-chart/time-series-chart.component';

@Component({
  selector: 'app-charts',
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTimepickerModule,
    MatTooltipModule,
    ChartsSensorPanelComponent,
    TimeSeriesChartComponent,
  ],
  templateUrl: './charts.component.html',
  styleUrl: './charts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ChartsService],
})
export class ChartsComponent {
  readonly chartsService = inject(ChartsService);
  readonly customFrom = signal<Date | null>(null);
  readonly customTo = signal<Date | null>(null);
  private readonly dialog = inject(MatDialog);

  constructor() {
    const sensorId = inject(ActivatedRoute).snapshot.queryParamMap.get('sensorId');
    this.chartsService.initialize(sensorId);
  }

  onRangePresetChange = (event: MatButtonToggleChange): void => {
    const preset = event.value as ChartRangePreset;
    this.chartsService.setRangePreset(preset);
    if (preset === 'custom') {
      const window = this.chartsService.historyWindow();
      this.customFrom.set(toDateOrNull(window.from));
      this.customTo.set(toDateOrNull(window.to));
    }
  };

  onFromDate = (value: Date | null): void => {
    this.customFrom.set(applyCalendarDate(value, this.customFrom()));
  };

  onFromTime = (value: Date | null): void => {
    this.customFrom.set(applyClockTime(value, this.customFrom()));
  };

  onToDate = (value: Date | null): void => {
    this.customTo.set(applyCalendarDate(value, this.customTo()));
  };

  onToTime = (value: Date | null): void => {
    this.customTo.set(applyClockTime(value, this.customTo()));
  };

  applyCustomRange = (): void => {
    const fromIso = fromDateOrNull(this.customFrom());
    const toIso = fromDateOrNull(this.customTo());
    if (fromIso === null || toIso === null) {
      this.chartsService.applyCustomRange('', '');
      return;
    }

    this.chartsService.applyCustomRange(fromIso, toIso);
  };

  openFullscreen = (): void => {
    this.dialog.open(ChartsFullscreenDialogComponent, {
      data: { chartsService: this.chartsService },
      width: '90%',
      maxWidth: 'none',
      autoFocus: false,
      panelClass: 'charts-fullscreen-panel',
      backdropClass: 'charts-fullscreen-backdrop',
    });
  };
}
