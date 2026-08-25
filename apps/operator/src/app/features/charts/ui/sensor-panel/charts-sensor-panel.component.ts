import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { OverviewSensor } from '../../../../shared/types/api.types';
import { getChartSeriesColor } from '../../chart-colors';

@Component({
  selector: 'app-charts-sensor-panel',
  imports: [MatCheckboxModule],
  templateUrl: './charts-sensor-panel.component.html',
  styleUrl: './charts-sensor-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsSensorPanelComponent {
  readonly sensors = input.required<OverviewSensor[]>();
  readonly selectedIds = input.required<string[]>();
  readonly compact = input(false);
  readonly sensorToggle = output<string>();

  readonly isSelected = (sensorId: string): boolean => this.selectedIds().includes(sensorId);

  readonly isPrimary = (sensorId: string): boolean => this.selectedIds()[0] === sensorId;

  readonly isDisabled = (sensorId: string): boolean => {
    if (this.isSelected(sensorId)) {
      return this.selectedIds().length <= 1;
    }

    return this.selectedIds().length >= 4;
  };

  readonly seriesColor = (sensorId: string): string | null => {
    const index = this.selectedIds().indexOf(sensorId);
    return index < 0 ? null : getChartSeriesColor(index);
  };

  readonly onToggle = (sensorId: string): void => {
    if (this.isDisabled(sensorId)) {
      return;
    }

    this.sensorToggle.emit(sensorId);
  };
}
