-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('operator', 'admin');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('temperature', 'pressure', 'vibration', 'flow');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('warning', 'critical');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'acked', 'resolved');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lines" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" UUID NOT NULL,
    "line_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metric" "MetricType" NOT NULL,
    "unit" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_thresholds" (
    "id" UUID NOT NULL,
    "sensor_id" UUID NOT NULL,
    "min_value" DECIMAL(12,4),
    "max_value" DECIMAL(12,4),
    "severity" "AlertSeverity" NOT NULL,

    CONSTRAINT "sensor_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "sensor_id" UUID NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "message" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE UNIQUE INDEX "lines_site_id_code_key" ON "lines"("site_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_line_id_code_key" ON "sensors"("line_id", "code");

-- CreateIndex
CREATE INDEX "alerts_status_opened_at_idx" ON "alerts"("status", "opened_at");

-- CreateIndex
CREATE INDEX "alerts_sensor_id_idx" ON "alerts"("sensor_id");

-- AddForeignKey
ALTER TABLE "lines" ADD CONSTRAINT "lines_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensor_thresholds" ADD CONSTRAINT "sensor_thresholds_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
