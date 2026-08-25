import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { SEED_IDS } from '../libs/common/src/constants/seed-ids';

const prisma = new PrismaClient();

async function main() {
  await prisma.alert.deleteMany();
  await prisma.sensorThreshold.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.line.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.user.createMany({
    data: [
      {
        id: SEED_IDS.admin,
        email: 'admin@telemetry.local',
        passwordHash,
        role: 'admin',
      },
      {
        id: SEED_IDS.operator,
        email: 'operator@telemetry.local',
        passwordHash,
        role: 'operator',
      },
    ],
  });

  await prisma.site.create({
    data: {
      id: SEED_IDS.site,
      code: 'PLANT-1',
      name: 'Demo Plant',
      lines: {
        create: [
          {
            id: SEED_IDS.lineA,
            code: 'LINE-A',
            name: 'Packaging Line A',
            sensors: {
              create: [
                {
                  id: SEED_IDS.sensors.t101,
                  code: 'T-101',
                  name: 'Oven temperature',
                  metric: 'temperature',
                  unit: '°C',
                  // Generator: T-101 excursion 94 (warning) / 103 (critical); пороги не ужесточать.
                  thresholds: {
                    create: [
                      {
                        minValue: 60,
                        maxValue: 90,
                        severity: 'warning',
                      },
                      {
                        minValue: 50,
                        maxValue: 100,
                        severity: 'critical',
                      },
                    ],
                  },
                },
                {
                  id: SEED_IDS.sensors.p201,
                  code: 'P-201',
                  name: 'Line pressure',
                  metric: 'pressure',
                  unit: 'bar',
                  thresholds: {
                    create: [
                      {
                        minValue: 1,
                        maxValue: 5,
                        severity: 'warning',
                      },
                      {
                        minValue: 0.5,
                        maxValue: 6,
                        severity: 'critical',
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            id: SEED_IDS.lineB,
            code: 'LINE-B',
            name: 'Conveyor Line B',
            sensors: {
              create: [
                {
                  id: SEED_IDS.sensors.v301,
                  code: 'V-301',
                  name: 'Motor vibration',
                  metric: 'vibration',
                  unit: 'mm/s',
                  thresholds: {
                    create: [
                      {
                        minValue: null,
                        maxValue: 4.5,
                        severity: 'warning',
                      },
                      {
                        minValue: null,
                        maxValue: 7,
                        severity: 'critical',
                      },
                    ],
                  },
                },
                {
                  id: SEED_IDS.sensors.f401,
                  code: 'F-401',
                  name: 'Coolant flow',
                  metric: 'flow',
                  unit: 'L/min',
                  thresholds: {
                    create: [
                      {
                        minValue: 10,
                        maxValue: 40,
                        severity: 'warning',
                      },
                      {
                        minValue: 5,
                        maxValue: 50,
                        severity: 'critical',
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  const counts = {
    users: await prisma.user.count(),
    sites: await prisma.site.count(),
    lines: await prisma.line.count(),
    sensors: await prisma.sensor.count(),
    thresholds: await prisma.sensorThreshold.count(),
  };

  console.log('Seed OK:', counts);
  console.log('Logins: admin@telemetry.local / operator@telemetry.local (password123)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
