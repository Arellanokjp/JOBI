import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Users only ever see their own notifications. */
  findAll(userId: string, unreadOnly = false) {
    return this.prisma.notifications.findMany({
      where: { user_id: userId, ...(unreadOnly ? { is_read: false } : {}) },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
  }

  async unreadCount(userId: string) {
    return { unread: await this.prisma.notifications.count({ where: { user_id: userId, is_read: false } }) };
  }

  async findOne(id: string, userId: string) {
    const item = await this.prisma.notifications.findFirst({ where: { id, user_id: userId } });
    if (!item) throw new NotFoundException('Notification not found.');
    return item;
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notifications.updateMany({
      where: { id, user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return this.findOne(id, userId);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    });
    return { updated: result.count };
  }

  async create(dto: CreateNotificationDto) {
    const user = await this.prisma.users.findFirst({
      where: { id: dto.user_id, deleted_at: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found.');

    return this.prisma.notifications.create({ data: { ...dto, id: randomUUID() } });
  }

  /** Hard delete (no deleted_at column); only your own notifications. */
  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.notifications.delete({ where: { id } });
  }
}
