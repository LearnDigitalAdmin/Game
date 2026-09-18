// src/global/messaging/InboxSystem.ts
// Complete inbox and messaging system for all game notifications
// Handles transfer offers, job offers, contract renewals, and game events

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { v4 as uuidv4 } from 'uuid';

/**
 * Message types in the game
 */
export type MessageType =
  | 'transfer_offer_received'
  | 'transfer_offer_counter'
  | 'transfer_offer_accepted'
  | 'transfer_offer_rejected'
  | 'transfer_completed'
  | 'contract_renewal_offer'
  | 'contract_renewed'
  | 'contract_expiring'
  | 'player_released'
  | 'job_offer'
  | 'player_injured'
  | 'player_recovered'
  | 'player_suspended'
  | 'suspension_expired'
  | 'player_retired'
  | 'manager_sacked'
  | 'match_result'
  | 'achievement_unlocked'
  | 'league_update'
  | 'system_notification';

/**
 * Message priority
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Inbox message
 */
export interface InboxMessage {
  id: string;
  recipientId: string; // Player ID, Manager ID, or Club ID
  recipientType: 'player' | 'manager' | 'club';
  messageType: MessageType;
  priority: MessagePriority;
  subject: string;
  content: string;
  senderName: string;
  senderType: 'club' | 'player' | 'system' | 'manager';
  relatedEntityId?: string; // Transfer ID, Contract ID, etc.
  relatedEntityType?: string;
  read: boolean;
  actionRequired: boolean;
  actionDeadline?: string;
  metadata: Record<string, any>;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Message template for reusable messages
 */
export interface MessageTemplate {
  id: string;
  messageType: MessageType;
  template: string; // Template with {{variables}}
  priority: MessagePriority;
  actionRequired: boolean;
}

/**
 * Inbox System
 * Manages all player, manager, and club messages
 */
export class InboxSystem {
  private db: SQLiteDBConnection | null = null;
  private templates: Map<MessageType, string> = new Map();

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
    this.initializeTemplates();
  }

  /**
   * Initialize message templates
   */
  private initializeTemplates(): void {
    this.templates.set('transfer_offer_received', 'Transfer Offer: {{senderName}} has made an offer of {{amount}}M for {{playerName}}');
    this.templates.set('transfer_offer_counter', 'Counter Offer: {{senderName}} countered with {{amount}}M');
    this.templates.set('transfer_offer_accepted', 'Transfer Completed: {{playerName}} transferred to {{clubName}}');
    this.templates.set('contract_renewal_offer', 'Contract Renewal: {{clubName}} offers {{newWage}}/week');
    this.templates.set('contract_expiring', 'Alert: Your contract expires on {{expiryDate}}');
    this.templates.set('player_injured', '🤕 {{playerName}} suffered a {{injuryType}} injury');
    this.templates.set('player_recovered', '✅ {{playerName}} has recovered from injury');
    this.templates.set('job_offer', 'Job Offer: {{clubName}} offers managerial position at {{salary}}/year');
    this.templates.set('manager_sacked', '🔴 You have been sacked by {{clubName}}');
    this.templates.set('match_result', 'Final: {{homeTeam}} {{homeScore}} - {{awayScore}} {{awayTeam}}');
    this.templates.set('achievement_unlocked', '🏆 Achievement Unlocked: {{achievementName}}');
    this.templates.set('system_notification', '{{message}}');
  }

  // ===== MESSAGE CREATION =====

  /**
   * Send message to recipient
   */
  async sendMessage(message: Omit<InboxMessage, 'id' | 'createdAt'>): Promise<InboxMessage | null> {
    if (!this.db) return null;

    try {
      const id = uuidv4();
      const now = new Date();

      const fullMessage: InboxMessage = {
        ...message,
        id,
        createdAt: now.toISOString(),
      };

      await this.db.run(
        `INSERT INTO inbox_messages
         (id, recipient_id, recipient_type, message_type, priority, subject, content, sender_name, sender_type,
          related_entity_id, related_entity_type, read, action_required, action_deadline, metadata, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          message.recipientId,
          message.recipientType,
          message.messageType,
          message.priority,
          message.subject,
          message.content,
          message.senderName,
          message.senderType,
          message.relatedEntityId || null,
          message.relatedEntityType || null,
          0, // not read
          message.actionRequired ? 1 : 0,
          message.actionDeadline || null,
          JSON.stringify(message.metadata),
          now.toISOString(),
          message.expiresAt || null,
        ]
      );

      console.log(`📧 Message sent: ${message.messageType} to ${message.recipientId}`);

      return fullMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  /**
   * Send templated message
   */
  async sendTemplatedMessage(
    recipientId: string,
    recipientType: 'player' | 'manager' | 'club',
    messageType: MessageType,
    variables: Record<string, any>,
    relatedEntityId?: string
  ): Promise<InboxMessage | null> {
    const template = this.templates.get(messageType);
    if (!template) {
      console.warn(`No template found for message type: ${messageType}`);
      return null;
    }

    // Replace variables in template
    let content = template;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(`{{${key}}}`, String(value));
    }

    const priority: MessagePriority = messageType.includes('urgent') ? 'urgent' : messageType.includes('offer') ? 'high' : 'normal';
    const actionRequired = ['transfer_offer_received', 'job_offer', 'contract_renewal_offer'].includes(messageType);

    const message: Omit<InboxMessage, 'id' | 'createdAt'> = {
      recipientId,
      recipientType,
      messageType,
      priority,
      subject: content.substring(0, 100),
      content,
      read: false,
      senderName: variables.senderName || 'System',
      senderType: (variables.senderType as any) || 'system',
      relatedEntityId,
      actionRequired,
      actionDeadline: actionRequired ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      metadata: variables,
    };

    return this.sendMessage(message);
  }

  // ===== MESSAGE RETRIEVAL =====

  /**
   * Get inbox for recipient
   */
  async getInbox(recipientId: string, unreadOnly: boolean = false, limit: number = 50): Promise<InboxMessage[]> {
    if (!this.db) return [];

    try {
      let query = `SELECT * FROM inbox_messages WHERE recipient_id = ?`;
      const params: any[] = [recipientId];

      if (unreadOnly) {
        query += ` AND read = 0`;
      }

      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      const result = await this.db.query(query, params);

      return (result.values || []).map(row => ({
        id: row.id,
        recipientId: row.recipient_id,
        recipientType: row.recipient_type,
        messageType: row.message_type,
        priority: row.priority,
        subject: row.subject,
        content: row.content,
        senderName: row.sender_name,
        senderType: row.sender_type,
        relatedEntityId: row.related_entity_id,
        relatedEntityType: row.related_entity_type,
        read: row.read === 1,
        actionRequired: row.action_required === 1,
        actionDeadline: row.action_deadline,
        metadata: JSON.parse(row.metadata),
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }));
    } catch (error) {
      console.error('Error getting inbox:', error);
      return [];
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(recipientId: string): Promise<number> {
    if (!this.db) return 0;

    try {
      const result = await this.db.query(`SELECT COUNT(*) as count FROM inbox_messages WHERE recipient_id = ? AND read = 0`, [
        recipientId,
      ]);

      return result.values?.[0]?.count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Get messages requiring action
   */
  async getActionRequiredMessages(recipientId: string): Promise<InboxMessage[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.query(
        `SELECT * FROM inbox_messages
         WHERE recipient_id = ? AND action_required = 1 AND read = 0 AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY priority DESC, created_at DESC`,
        [recipientId, new Date().toISOString()]
      );

      return (result.values || []).map(row => ({
        id: row.id,
        recipientId: row.recipient_id,
        recipientType: row.recipient_type,
        messageType: row.message_type,
        priority: row.priority,
        subject: row.subject,
        content: row.content,
        senderName: row.sender_name,
        senderType: row.sender_type,
        relatedEntityId: row.related_entity_id,
        relatedEntityType: row.related_entity_type,
        read: row.read === 1,
        actionRequired: row.action_required === 1,
        actionDeadline: row.action_deadline,
        metadata: JSON.parse(row.metadata),
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      }));
    } catch (error) {
      console.error('Error getting action messages:', error);
      return [];
    }
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: string): Promise<InboxMessage | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.query(`SELECT * FROM inbox_messages WHERE id = ?`, [messageId]);

      if (!result.values?.length) return null;

      const row = result.values[0];
      return {
        id: row.id,
        recipientId: row.recipient_id,
        recipientType: row.recipient_type,
        messageType: row.message_type,
        priority: row.priority,
        subject: row.subject,
        content: row.content,
        senderName: row.sender_name,
        senderType: row.sender_type,
        relatedEntityId: row.related_entity_id,
        relatedEntityType: row.related_entity_type,
        read: row.read === 1,
        actionRequired: row.action_required === 1,
        actionDeadline: row.action_deadline,
        metadata: JSON.parse(row.metadata),
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      };
    } catch (error) {
      console.error('Error getting message:', error);
      return null;
    }
  }

  // ===== MESSAGE ACTIONS =====

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      await this.db.run(`UPDATE inbox_messages SET read = 1 WHERE id = ?`, [messageId]);
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  /**
   * Mark all messages as read
   */
  async markAllAsRead(recipientId: string): Promise<number> {
    if (!this.db) return 0;

    try {
      const result = await this.db.query(`SELECT COUNT(*) as count FROM inbox_messages WHERE recipient_id = ? AND read = 0`, [
        recipientId,
      ]);

      await this.db.run(`UPDATE inbox_messages SET read = 1 WHERE recipient_id = ? AND read = 0`, [recipientId]);

      return result.values?.[0]?.count || 0;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return 0;
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      await this.db.run(`DELETE FROM inbox_messages WHERE id = ?`, [messageId]);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  /**
   * Archive message (mark as processed)
   */
  async archiveMessage(messageId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      await this.db.run(
        `UPDATE inbox_messages SET action_required = 0, read = 1 WHERE id = ?`,
        [messageId]
      );
      return true;
    } catch (error) {
      console.error('Error archiving message:', error);
      return false;
    }
  }

  // ===== CLEANUP =====

  /**
   * Delete expired messages (cleanup)
   */
  async cleanupExpiredMessages(): Promise<number> {
    if (!this.db) return 0;

    try {
      const result = await this.db.query(`SELECT COUNT(*) as count FROM inbox_messages WHERE expires_at IS NOT NULL AND expires_at <= ?`, [
        new Date().toISOString(),
      ]);

      const count = result.values?.[0]?.count || 0;

      await this.db.run(`DELETE FROM inbox_messages WHERE expires_at IS NOT NULL AND expires_at <= ?`, [
        new Date().toISOString(),
      ]);

      if (count > 0) {
        console.log(`🗑️  Cleaned up ${count} expired messages`);
      }

      return count;
    } catch (error) {
      console.error('Error cleaning up messages:', error);
      return 0;
    }
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default InboxSystem;
