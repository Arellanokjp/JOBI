import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

/** Works with both the PrismaService and an interactive-transaction client. */
type NotifyDb = Pick<PrismaClient, 'notifications'>;

export const NOTIFICATION_TYPE = {
  APPLICATION_RECEIVED: 'APPLICATION_RECEIVED',
  APPLICATION_STATUS: 'APPLICATION_STATUS',
  INTERVIEW: 'INTERVIEW',
  COMPANY_VERIFICATION: 'COMPANY_VERIFICATION',
  GENERAL: 'GENERAL',
} as const;

export function createNotification(
  db: NotifyDb,
  data: { user_id: string; title: string; message: string; notification_type: string },
) {
  return db.notifications.create({ data: { id: randomUUID(), ...data } });
}
