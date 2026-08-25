import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller()
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get('sites')
  listSites() {
    return this.monitoring.listSites();
  }

  @Get('sites/:siteId/overview')
  getOverview(@Param('siteId') siteId: string) {
    return this.monitoring.getOverview(siteId);
  }

  @Get('sensors')
  listSensors(
    @Query('siteId') siteId?: string,
    @Query('lineId') lineId?: string,
    @Query('metric') metric?: string,
  ) {
    return this.monitoring.listSensors({ siteId, lineId, metric });
  }

  @Get('sensors/:id')
  getSensor(@Param('id') id: string) {
    return this.monitoring.getSensor(id);
  }

  @Get('sensors/:id/history')
  getHistory(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('interval') interval?: string,
  ) {
    return this.monitoring.getHistory(id, from, to, limit, interval);
  }

  @Post('sensors')
  createSensor(@Body() body: CreateSensorBody) {
    return this.monitoring.createSensor(body);
  }

  @Patch('sensors/:id')
  updateSensor(@Param('id') id: string, @Body() body: UpdateSensorBody) {
    return this.monitoring.updateSensor(id, body);
  }

  @Put('sensors/:id/thresholds')
  replaceThresholds(@Param('id') id: string, @Body() body: ReplaceThresholdsBody) {
    return this.monitoring.replaceThresholds(id, body);
  }

  @Get('alerts')
  listAlerts(
    @Query('status') status?: string,
    @Query('siteId') siteId?: string,
    @Query('sensorId') sensorId?: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.monitoring.listAlerts({
      status,
      siteId,
      sensorId,
      severity,
      from,
      to,
      limit,
      offset,
    });
  }

  @Patch('alerts/:id/ack')
  ackAlert(@Param('id') id: string) {
    return this.monitoring.ackAlert(id);
  }
}

interface CreateSensorBody {
  lineId: string;
  code: string;
  name: string;
  metric: 'temperature' | 'pressure' | 'vibration' | 'flow';
  unit: string;
  isActive?: boolean;
}

interface UpdateSensorBody {
  code?: string;
  name?: string;
  unit?: string;
  isActive?: boolean;
}

interface ReplaceThresholdsBody {
  thresholds: Array<{
    minValue?: number | null;
    maxValue?: number | null;
    severity: 'warning' | 'critical';
  }>;
}
