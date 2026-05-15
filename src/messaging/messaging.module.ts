import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [NotificationsModule, WhatsAppModule],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
