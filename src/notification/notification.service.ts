import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomerService } from 'src/customer/customer.service';
import { CommentEntity } from 'src/entities/comment.entity';
import { FinishedEntity } from 'src/entities/finished.entity';
import { InvoiceEntity } from 'src/entities/invoice.entity';
import { NotificationEntity } from 'src/entities/notification.entity';
import { FirebaseService } from 'src/firebase/firebase.service';
import { UserService } from 'src/user/user.service';
import { UserType } from 'src/utils/user-type.enum';
import { formatRunningWorkoutTitle } from 'src/utils/workout-labels.util';
import { Brackets, In, IsNull, Repository } from 'typeorm';
import {
  CreateNotificationV2Payload,
  NotificationV2Action,
  NotificationV2Item,
  NotificationV2Metadata,
  NotificationV2Navigation,
  UpdateNotificationV2Payload,
} from './notification-v2.types';

type NotificationLoginPayload = {
  userId: number;
  typeUser: number;
};

type FeedbackNotificationContext = {
  finishedId: number;
  workoutTitle: string | null;
  workoutSubtitle: string | null;
  referenceDate: string | null;
  isRunning: boolean;
  message: string | null;
  workoutId: string | null;
  workoutsId: string | null;
};

type InvoiceNotificationContext = {
  invoiceId: number;
  amount: string | null;
  dueDate: Date | null;
  description: string | null;
};

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepository: Repository<NotificationEntity>,

    @InjectRepository(FinishedEntity)
    private finishedRepository: Repository<FinishedEntity>,

    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,

    @InjectRepository(InvoiceEntity)
    private invoiceRepository: Repository<InvoiceEntity>,

    private readonly customersService: CustomerService,

    private readonly firebaseService: FirebaseService,

    private readonly userService: UserService,
  ) {}

  private normalizeValue(value?: string | null) {
    return (value || '').trim().toLowerCase();
  }

  private toStringValue(value: unknown): string | null {
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.length ? normalized : null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return null;
  }

  private parseDateValue(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [day, month, year] = value.split('/').map(Number);
      const parsedDate = new Date(year, month - 1, day);
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    const parsedDate = new Date(value as string | number);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private formatDateLabel(value: unknown): string | null {
    if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return value;
    }

    const parsedDate = this.parseDateValue(value);

    if (!parsedDate) {
      return null;
    }

    const day = String(parsedDate.getDate()).padStart(2, '0');
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const year = String(parsedDate.getFullYear());

    return `${day}/${month}/${year}`;
  }

  private formatTimeAgo(value: unknown): string {
    const parsedDate = this.parseDateValue(value);

    if (!parsedDate) {
      return '';
    }

    const diffInMs = Date.now() - parsedDate.getTime();

    if (diffInMs <= 0) {
      return 'agora';
    }

    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minuto${diffInMinutes === 1 ? '' : 's'} atrás`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);

    if (diffInHours < 24) {
      return `${diffInHours} hora${diffInHours === 1 ? '' : 's'} atrás`;
    }

    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays < 30) {
      return `${diffInDays} dia${diffInDays === 1 ? '' : 's'} atrás`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);

    if (diffInMonths < 12) {
      return `${diffInMonths} ${diffInMonths === 1 ? 'mês' : 'meses'} atrás`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} ano${diffInYears === 1 ? '' : 's'} atrás`;
  }

  private firstNonEmpty(...values: Array<unknown>): string | null {
    for (const value of values) {
      const normalizedValue = this.toStringValue(value);

      if (normalizedValue) {
        return normalizedValue;
      }
    }

    return null;
  }

  private extractNumericId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number(value);
    }

    if (typeof value === 'string') {
      const normalized = value.trim();

      if (/^\d+$/.test(normalized)) {
        return Number(normalized);
      }
    }

    return null;
  }

  private resolveFeedbackWorkoutKind(
    metadata: NotificationV2Metadata | null,
    feedbackContext?: FeedbackNotificationContext,
  ): 'running' | 'strength' | null {
    const metadataWorkoutKind = this.normalizeValue(
      this.toStringValue(metadata?.workoutKind),
    );

    if (metadataWorkoutKind === 'running') {
      return 'running';
    }

    if (metadataWorkoutKind === 'strength') {
      return 'strength';
    }

    if (feedbackContext) {
      return feedbackContext.isRunning ? 'running' : 'strength';
    }

    return null;
  }

  private resolveFeedbackTitle(
    notification: NotificationEntity,
    metadata: NotificationV2Metadata | null,
    feedbackContext?: FeedbackNotificationContext,
  ): string | null {
    const workoutKind = this.resolveFeedbackWorkoutKind(
      metadata,
      feedbackContext,
    );
    const metadataWorkoutTitle = this.toStringValue(metadata?.workoutTitle);
    const metadataWorkoutSubtitle = this.toStringValue(
      metadata?.workoutSubtitle,
    );
    const contextWorkoutTitle = feedbackContext?.workoutTitle ?? null;
    const contextWorkoutSubtitle = feedbackContext?.workoutSubtitle ?? null;

    if (workoutKind === 'running') {
      return this.firstNonEmpty(
        formatRunningWorkoutTitle(metadataWorkoutTitle),
        formatRunningWorkoutTitle(contextWorkoutTitle),
        notification.title !== 'Olá' ? notification.title : null,
      );
    }

    if (workoutKind === 'strength') {
      return this.firstNonEmpty(
        metadataWorkoutSubtitle,
        contextWorkoutSubtitle,
        metadataWorkoutTitle,
        contextWorkoutTitle,
        notification.title !== 'Olá' ? notification.title : null,
      );
    }

    return this.firstNonEmpty(
      metadataWorkoutTitle,
      contextWorkoutTitle,
      notification.title !== 'Olá' ? notification.title : null,
    );
  }

  private resolveFeedbackWorkoutNavigationId(
    metadata: NotificationV2Metadata | null,
    feedbackContext?: FeedbackNotificationContext,
  ): string | null {
    return (
      this.toStringValue(metadata?.workoutsId) ??
      feedbackContext?.workoutsId ??
      this.toStringValue(metadata?.workoutId) ??
      feedbackContext?.workoutId ??
      null
    );
  }

  private normalizeMetadata(
    notification: NotificationEntity,
  ): NotificationV2Metadata | null {
    if (
      !notification.metadata ||
      typeof notification.metadata !== 'object' ||
      Array.isArray(notification.metadata)
    ) {
      return null;
    }

    return notification.metadata as NotificationV2Metadata;
  }

  private normalizeNavigationParams(
    value: unknown,
  ): Record<string, unknown> | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      try {
        const parsedValue = JSON.parse(value);

        if (
          parsedValue &&
          typeof parsedValue === 'object' &&
          !Array.isArray(parsedValue)
        ) {
          return parsedValue as Record<string, unknown>;
        }
      } catch {
        return null;
      }

      return null;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return null;
  }

  private normalizeMetadataNavigation(
    metadata: NotificationV2Metadata | null,
  ): NotificationV2Navigation | null {
    const navigation = metadata?.navigation;

    if (
      !navigation ||
      typeof navigation !== 'object' ||
      Array.isArray(navigation)
    ) {
      return null;
    }

    const url = this.toStringValue(navigation.url) ?? null;
    const screen = this.toStringValue(navigation.screen) ?? null;
    const params = this.normalizeNavigationParams(navigation.params);

    if (!url && !screen && !params) {
      return null;
    }

    return {
      url,
      screen,
      params,
    };
  }

  private extractFinishedId(
    notification: NotificationEntity,
    metadata: NotificationV2Metadata | null,
  ): number | null {
    return (
      this.extractNumericId(metadata?.finishedId) ??
      this.extractNumericId(notification.link)
    );
  }

  private extractInvoiceId(
    notification: NotificationEntity,
    metadata: NotificationV2Metadata | null,
  ): number | null {
    const metadataInvoiceId = this.extractNumericId(metadata?.invoiceId);

    if (metadataInvoiceId) {
      return metadataInvoiceId;
    }

    const link = this.toStringValue(notification.link);

    if (!link) {
      return null;
    }

    const directId = this.extractNumericId(link);

    if (directId) {
      return directId;
    }

    const match = link.match(/(\d+)(?!.*\d)/);
    return match ? Number(match[1]) : null;
  }

  private async validateNotificationRecipient(notification: {
    recipientId?: number | string | null;
    recipientUserId?: number | string | null;
  }) {
    const hasRecipientId =
      notification.recipientId !== undefined &&
      notification.recipientId !== null;
    const hasRecipientUserId =
      notification.recipientUserId !== undefined &&
      notification.recipientUserId !== null;

    if (!hasRecipientId && !hasRecipientUserId) {
      throw new BadRequestException(
        'recipientId ou recipientUserId é obrigatório',
      );
    }

    if (hasRecipientId) {
      await this.customersService.findCustomerById(
        Number(notification.recipientId),
      );
    }

    if (hasRecipientUserId) {
      const user = await this.userService.findById(
        Number(notification.recipientUserId),
      );

      if (!user) {
        throw new NotFoundException(
          `User id: ${notification.recipientUserId} not found`,
        );
      }
    }
  }

  private async resolveLegacyTeacherCustomerIds(userId: number) {
    const [teacherUser, teacherCustomers] = await Promise.all([
      this.userService.findById(userId),
      this.customersService.findCustomersByUserId(userId),
    ]);

    if (!teacherUser) {
      return [];
    }

    const normalizedTeacherEmail = this.normalizeValue(teacherUser.email);
    const normalizedTeacherName = this.normalizeValue(teacherUser.name);

    return teacherCustomers
      .filter((customer) => customer.active)
      .filter(
        (customer) =>
          this.normalizeValue(customer.email) === normalizedTeacherEmail ||
          this.normalizeValue(customer.name) === normalizedTeacherName,
      )
      .map((customer) => customer.id);
  }

  private async resolveNotificationAccess(
    loginPayload: NotificationLoginPayload,
  ) {
    if (loginPayload.typeUser === UserType.User) {
      return {
        recipientIds: [loginPayload.userId],
        recipientUserId: null,
      };
    }

    return {
      recipientIds: await this.resolveLegacyTeacherCustomerIds(
        loginPayload.userId,
      ),
      recipientUserId: loginPayload.userId,
    };
  }

  private async buildNotificationsQuery(
    loginPayload: NotificationLoginPayload,
    type?: string,
  ) {
    const { recipientIds, recipientUserId } =
      await this.resolveNotificationAccess(loginPayload);

    if (!recipientIds.length && !recipientUserId) {
      return null;
    }

    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.read_at IS NULL')
      .andWhere(
        new Brackets((qb) => {
          if (recipientIds.length) {
            qb.where('notification.recipient_id IN (:...recipientIds)', {
              recipientIds,
            });
          }

          if (recipientUserId) {
            if (recipientIds.length) {
              qb.orWhere('notification.recipient_user_id = :recipientUserId', {
                recipientUserId,
              });
            } else {
              qb.where('notification.recipient_user_id = :recipientUserId', {
                recipientUserId,
              });
            }
          }
        }),
      );

    if (type) {
      query.andWhere('notification.type = :type', { type });
    }

    return query.orderBy('notification.created_at', 'DESC');
  }

  private async buildFeedbackContexts(
    notifications: NotificationEntity[],
  ): Promise<Map<number, FeedbackNotificationContext>> {
    const finishedIds = Array.from(
      new Set(
        notifications
          .filter((notification) => notification.type === 'feedback')
          .map((notification) =>
            this.extractFinishedId(
              notification,
              this.normalizeMetadata(notification),
            ),
          )
          .filter((id): id is number => id !== null),
      ),
    );

    if (!finishedIds.length) {
      return new Map();
    }

    const [finishedRows, adminComments] = await Promise.all([
      this.finishedRepository
        .createQueryBuilder('finished')
        .leftJoin('finished.workout', 'workout')
        .leftJoin('finished.workouts', 'workouts')
        .select('finished.id', 'finishedId')
        .addSelect('finished.executionDay', 'executionDay')
        .addSelect('finished.feedback', 'legacyFeedback')
        .addSelect('COALESCE(workout.name, workouts.title)', 'workoutTitle')
        .addSelect(
          'COALESCE(workout.subtitle, workouts.subtitle)',
          'workoutSubtitle',
        )
        .addSelect('COALESCE(workout.running, workouts.running)', 'isRunning')
        .addSelect('CAST(finished.workoutId AS text)', 'workoutId')
        .addSelect('CAST(finished.workoutsId AS text)', 'workoutsId')
        .where('finished.id IN (:...finishedIds)', { finishedIds })
        .getRawMany(),
      this.commentRepository
        .createQueryBuilder('comment')
        .select('comment.finishedId', 'finishedId')
        .addSelect('comment.content', 'content')
        .where('comment.isAdmin = true')
        .andWhere('comment.finishedId IN (:...finishedIds)', {
          finishedIds,
        })
        .orderBy('comment.finishedId', 'ASC')
        .addOrderBy('comment.createdAt', 'DESC')
        .getRawMany(),
    ]);

    const latestCommentByFinishedId = new Map<number, string>();

    adminComments.forEach((comment) => {
      const finishedId = Number(comment.finishedId);

      if (!latestCommentByFinishedId.has(finishedId)) {
        latestCommentByFinishedId.set(finishedId, comment.content);
      }
    });

    const feedbackContexts = new Map<number, FeedbackNotificationContext>();

    finishedRows.forEach((row) => {
      const finishedId = Number(row.finishedId);

      feedbackContexts.set(finishedId, {
        finishedId,
        workoutTitle: this.toStringValue(row.workoutTitle),
        workoutSubtitle: this.toStringValue(row.workoutSubtitle),
        referenceDate: this.toStringValue(row.executionDay),
        isRunning: row.isRunning === true || row.isRunning === 'true',
        message:
          latestCommentByFinishedId.get(finishedId) ??
          this.toStringValue(row.legacyFeedback),
        workoutId: this.toStringValue(row.workoutId),
        workoutsId: this.toStringValue(row.workoutsId),
      });
    });

    return feedbackContexts;
  }

  private async buildInvoiceContexts(
    notifications: NotificationEntity[],
  ): Promise<Map<number, InvoiceNotificationContext>> {
    const invoiceIds = Array.from(
      new Set(
        notifications
          .filter((notification) => notification.type === 'invoice')
          .map((notification) =>
            this.extractInvoiceId(
              notification,
              this.normalizeMetadata(notification),
            ),
          )
          .filter((id): id is number => id !== null),
      ),
    );

    if (!invoiceIds.length) {
      return new Map();
    }

    const invoices = await this.invoiceRepository.findBy({
      id: In(invoiceIds),
    });

    return invoices.reduce((accumulator, invoice) => {
      accumulator.set(invoice.id, {
        invoiceId: invoice.id,
        amount: this.toStringValue(invoice.totalAmount),
        dueDate: invoice.dueDate ?? null,
        description: this.toStringValue(invoice.description),
      });

      return accumulator;
    }, new Map<number, InvoiceNotificationContext>());
  }

  private resolveVariant(
    notification: NotificationEntity,
    metadata: NotificationV2Metadata | null,
    feedbackContext?: FeedbackNotificationContext,
  ): string {
    if (notification.type === 'feedback') {
      const workoutKind = this.normalizeValue(
        this.toStringValue(metadata?.workoutKind),
      );

      if (workoutKind === 'running') {
        return 'feedback-running';
      }

      if (workoutKind === 'strength') {
        return 'feedback-strength';
      }

      return feedbackContext?.isRunning
        ? 'feedback-running'
        : 'feedback-strength';
    }

    if (notification.type === 'invoice') {
      return 'invoice';
    }

    if (notification.type === 'training') {
      return 'training';
    }

    if (notification.type === 'running-finished-all') {
      return 'running-finished-all';
    }

    if (notification.type === 'alert') {
      return 'alert';
    }

    return 'generic';
  }

  private resolveIcon(
    metadata: NotificationV2Metadata | null,
    variant: string,
  ): string {
    const metadataIcon = this.toStringValue(metadata?.icon);

    if (metadataIcon) {
      return metadataIcon;
    }

    switch (variant) {
      case 'feedback-running':
        return 'running';
      case 'feedback-strength':
        return 'strength';
      case 'invoice':
        return 'invoice';
      case 'training':
        return 'training';
      case 'running-finished-all':
        return 'running';
      case 'alert':
        return 'alert';
      default:
        return 'notification';
    }
  }

  private resolveTitle(
    notification: NotificationEntity,
    metadata: NotificationV2Metadata | null,
    feedbackContext?: FeedbackNotificationContext,
  ): string {
    if (notification.type === 'feedback') {
      return (
        this.resolveFeedbackTitle(notification, metadata, feedbackContext) ??
        'Feedback de treino'
      );
    }

    return (
      this.firstNonEmpty(notification.title, notification.content) ??
      'Notificação'
    );
  }

  private resolveContent(
    notification: NotificationEntity,
    title: string,
    metadata: NotificationV2Metadata | null,
    feedbackContext?: FeedbackNotificationContext,
    invoiceContext?: InvoiceNotificationContext,
  ): string | null {
    if (notification.type === 'feedback') {
      return this.firstNonEmpty(
        metadata?.contentPreview,
        notification.content,
        feedbackContext?.message,
      );
    }

    if (notification.type === 'invoice') {
      const genericContent = this.toStringValue(notification.content);

      if (genericContent && genericContent !== title) {
        return genericContent;
      }

      return this.firstNonEmpty(metadata?.amount, invoiceContext?.amount);
    }

    if (notification.type === 'training') {
      const genericContent = this.toStringValue(notification.content);
      return genericContent && genericContent !== title ? genericContent : null;
    }

    return this.toStringValue(notification.content);
  }

  private resolveReferenceDate(
    notification: NotificationEntity,
    metadata: NotificationV2Metadata | null,
    feedbackContext?: FeedbackNotificationContext,
  ): string | null {
    if (notification.type === 'feedback') {
      return this.firstNonEmpty(
        metadata?.referenceDate,
        feedbackContext?.referenceDate,
      );
    }

    return this.firstNonEmpty(metadata?.referenceDate);
  }

  private resolveNavigation(
    notification: NotificationEntity,
    metadata: NotificationV2Metadata | null,
    finishedId: number | null,
    invoiceId: number | null,
    feedbackContext?: FeedbackNotificationContext,
  ): NotificationV2Navigation | null {
    const metadataNavigation = this.normalizeMetadataNavigation(metadata);

    if (metadataNavigation) {
      return metadataNavigation;
    }

    if (notification.type === 'feedback' && finishedId) {
      const workoutNavigationId = this.resolveFeedbackWorkoutNavigationId(
        metadata,
        feedbackContext,
      );

      return {
        url: `jfapp://activitie-details?finishedId=${finishedId}&notificationId=${notification.id}`,
        screen: 'activitie-details',
        params: {
          finishedId: String(finishedId),
          ...(workoutNavigationId
            ? { workoutId: String(workoutNavigationId) }
            : {}),
          notificationId: String(notification.id),
          source: 'notification-v2',
        },
      };
    }

    if (notification.type === 'invoice' && invoiceId) {
      return {
        url:
          this.toStringValue(notification.link) ??
          `/api/v2/invoice?invoiceId=${invoiceId}`,
        screen: 'invoice',
        params: {
          invoiceId: String(invoiceId),
          notificationId: String(notification.id),
          source: 'notification-v2',
        },
      };
    }

    const link = this.toStringValue(notification.link);

    if (!link) {
      return null;
    }

    return {
      url: link,
      screen: null,
      params: null,
    };
  }

  private resolveAction(
    notification: NotificationEntity,
    metadata: NotificationV2Metadata | null,
    navigation: NotificationV2Navigation | null,
  ): NotificationV2Action | null {
    const metadataActionLabel = this.toStringValue(metadata?.actionLabel);
    const metadataActionKind = this.toStringValue(metadata?.actionKind) as
      | NotificationV2Action['kind']
      | null;

    if (metadataActionLabel) {
      return {
        label: metadataActionLabel,
        kind:
          metadataActionKind ??
          (notification.type === 'feedback'
            ? 'reply'
            : navigation
              ? 'open'
              : 'mark-as-read'),
      };
    }

    if (notification.type === 'feedback' && navigation) {
      return {
        label: 'Responder',
        kind: 'reply',
      };
    }

    return null;
  }

  private buildResponseMetadata(
    metadata: NotificationV2Metadata | null,
    finishedId: number | null,
    invoiceId: number | null,
    feedbackContext: FeedbackNotificationContext | undefined,
    invoiceContext: InvoiceNotificationContext | undefined,
    navigation: NotificationV2Navigation | null,
  ): NotificationV2Metadata | null {
    const responseMetadata: NotificationV2Metadata = { ...(metadata ?? {}) };

    if (finishedId && responseMetadata.finishedId === undefined) {
      responseMetadata.finishedId = finishedId;
    }

    if (invoiceId && responseMetadata.invoiceId === undefined) {
      responseMetadata.invoiceId = invoiceId;
    }

    if (
      feedbackContext?.workoutTitle &&
      responseMetadata.workoutTitle === undefined
    ) {
      responseMetadata.workoutTitle = feedbackContext.workoutTitle;
    }

    if (
      feedbackContext?.workoutSubtitle &&
      responseMetadata.workoutSubtitle === undefined
    ) {
      responseMetadata.workoutSubtitle = feedbackContext.workoutSubtitle;
    }

    if (
      feedbackContext?.referenceDate &&
      responseMetadata.referenceDate === undefined
    ) {
      responseMetadata.referenceDate = feedbackContext.referenceDate;
    }

    if (feedbackContext && responseMetadata.workoutKind === undefined) {
      responseMetadata.workoutKind = feedbackContext.isRunning
        ? 'running'
        : 'strength';
    }

    if (
      feedbackContext?.workoutId &&
      responseMetadata.workoutId === undefined
    ) {
      responseMetadata.workoutId = feedbackContext.workoutId;
    }

    if (
      feedbackContext?.workoutsId &&
      responseMetadata.workoutsId === undefined
    ) {
      responseMetadata.workoutsId = feedbackContext.workoutsId;
    }

    if (invoiceContext?.amount && responseMetadata.amount === undefined) {
      responseMetadata.amount = invoiceContext.amount;
    }

    if (navigation && responseMetadata.navigation === undefined) {
      responseMetadata.navigation = {
        url: navigation.url,
        screen: navigation.screen,
        params: navigation.params,
      };
    }

    return Object.keys(responseMetadata).length ? responseMetadata : null;
  }

  private buildNotificationV2Item(
    notification: NotificationEntity,
    feedbackContexts: Map<number, FeedbackNotificationContext>,
    invoiceContexts: Map<number, InvoiceNotificationContext>,
  ): NotificationV2Item {
    const metadata = this.normalizeMetadata(notification);
    const finishedId = this.extractFinishedId(notification, metadata);
    const invoiceId =
      notification.type === 'invoice'
        ? this.extractInvoiceId(notification, metadata)
        : null;
    const feedbackContext = finishedId
      ? feedbackContexts.get(finishedId)
      : undefined;
    const invoiceContext = invoiceId
      ? invoiceContexts.get(invoiceId)
      : undefined;
    const variant = this.resolveVariant(
      notification,
      metadata,
      feedbackContext,
    );
    const title = this.resolveTitle(notification, metadata, feedbackContext);
    const content = this.resolveContent(
      notification,
      title,
      metadata,
      feedbackContext,
      invoiceContext,
    );
    const referenceDate = this.resolveReferenceDate(
      notification,
      metadata,
      feedbackContext,
    );
    const navigation = this.resolveNavigation(
      notification,
      metadata,
      finishedId,
      invoiceId,
      feedbackContext,
    );
    const responseMetadata = this.buildResponseMetadata(
      metadata,
      finishedId,
      invoiceId,
      feedbackContext,
      invoiceContext,
      navigation,
    );

    return {
      id: notification.id,
      type: notification.type,
      variant,
      title,
      content,
      referenceDate,
      referenceDateLabel: this.formatDateLabel(referenceDate),
      createdAt: notification.createdAt,
      createdAtLabel: this.formatTimeAgo(notification.createdAt),
      readAt: notification.readAt,
      link: this.toStringValue(notification.link),
      icon: this.resolveIcon(metadata, variant),
      action: this.resolveAction(notification, metadata, navigation),
      navigation,
      metadata: responseMetadata,
    };
  }

  private async buildNotificationsV2Items(
    notifications: NotificationEntity[],
  ): Promise<NotificationV2Item[]> {
    if (!notifications.length) {
      return [];
    }

    const [feedbackContexts, invoiceContexts] = await Promise.all([
      this.buildFeedbackContexts(notifications),
      this.buildInvoiceContexts(notifications),
    ]);

    return notifications.map((notification) =>
      this.buildNotificationV2Item(
        notification,
        feedbackContexts,
        invoiceContexts,
      ),
    );
  }

  async getNotificationByRecipientId(
    loginPayload: NotificationLoginPayload,
  ): Promise<NotificationEntity[]> {
    try {
      const query = await this.buildNotificationsQuery(loginPayload);

      if (!query) {
        return [];
      }

      return query.getMany();
    } catch (error) {
      throw new Error(error);
    }
  }

  async getNotificationByRecipientIdV2(
    loginPayload: NotificationLoginPayload,
  ): Promise<NotificationV2Item[]> {
    try {
      const query = await this.buildNotificationsQuery(loginPayload);

      if (!query) {
        return [];
      }

      const notifications = await query.getMany();
      return this.buildNotificationsV2Items(notifications);
    } catch (error) {
      throw new Error(error);
    }
  }

  async getNotificationsByCustomerIdV2(
    customerId: number,
  ): Promise<NotificationV2Item[]> {
    await this.customersService.findCustomerById(Number(customerId));

    const notifications = await this.notificationRepository.find({
      where: {
        recipientId: Number(customerId),
        readAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return this.buildNotificationsV2Items(notifications);
  }

  async getNotificationByIdV2(
    notificationId: number,
  ): Promise<NotificationV2Item> {
    const notification = await this.notificationRepository.findOne({
      where: {
        id: Number(notificationId),
      },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification id: ${notificationId} not found`,
      );
    }

    const [formattedNotification] = await this.buildNotificationsV2Items([
      notification,
    ]);

    return formattedNotification;
  }

  async getRunningFinishedAllNotifications(
    loginPayload: NotificationLoginPayload,
  ): Promise<NotificationEntity[]> {
    try {
      const query = await this.buildNotificationsQuery(
        loginPayload,
        'running-finished-all',
      );

      if (!query) {
        return [];
      }

      return query.getMany();
    } catch (error) {
      throw new Error(error);
    }
  }

  async getRunningFinishedAllNotificationsV2(
    loginPayload: NotificationLoginPayload,
  ): Promise<NotificationV2Item[]> {
    try {
      const query = await this.buildNotificationsQuery(
        loginPayload,
        'running-finished-all',
      );

      if (!query) {
        return [];
      }

      const notifications = await query.getMany();
      return this.buildNotificationsV2Items(notifications);
    } catch (error) {
      throw new Error(error);
    }
  }

  async getUnreadCount(
    loginPayload: NotificationLoginPayload,
  ): Promise<{ count: number }> {
    if (loginPayload.typeUser !== UserType.User) {
      throw new UnauthorizedException();
    }

    const count = await this.notificationRepository.count({
      where: {
        recipientId: loginPayload.userId,
        readAt: IsNull(),
      },
    });

    return { count };
  }

  async createNotification(notification) {
    await this.validateNotificationRecipient(notification);

    return this.notificationRepository.save({
      ...notification,
      recipientId: notification.recipientId ?? null,
      recipientUserId: notification.recipientUserId ?? null,
    });
  }

  async sendNotification(notification) {
    if (!notification.recipientId) {
      throw new BadRequestException(
        'Push notification exige recipientId de customer',
      );
    }

    await this.validateNotificationRecipient(notification);

    const message = {
      title: notification.title,
      body: notification.content,
      data: {},
    };

    await this.firebaseService.sendNotificationNew(
      String(notification.recipientId),
      message,
    );

    return this.notificationRepository.save({
      ...notification,
      recipientUserId: null,
    });
  }

  async sendNotificationV2(
    notification: CreateNotificationV2Payload,
  ): Promise<NotificationV2Item> {
    await this.validateNotificationRecipient(notification);

    const notificationToSave: Partial<NotificationEntity> = {
      title: notification.title,
      type: notification.type,
      content: notification.content ?? '',
      link: notification.link ?? null,
      metadata: notification.metadata ?? null,
      recipientId: notification.recipientId
        ? Number(notification.recipientId)
        : null,
      recipientUserId: notification.recipientUserId
        ? Number(notification.recipientUserId)
        : null,
    };

    const notificationEntity =
      this.notificationRepository.create(notificationToSave);

    const savedNotification =
      await this.notificationRepository.save(notificationEntity);

    const [formattedNotification] = await this.buildNotificationsV2Items([
      savedNotification,
    ]);

    const shouldSendPush =
      notification.sendPush !== false && savedNotification.recipientId;

    if (shouldSendPush) {
      const navigation = formattedNotification.navigation;

      await this.firebaseService.sendNotificationNew(
        String(savedNotification.recipientId),
        {
          title:
            this.firstNonEmpty(
              formattedNotification.title,
              savedNotification.title,
            ) ?? savedNotification.title,
          body:
            this.firstNonEmpty(
              notification.content,
              formattedNotification.content,
              formattedNotification.title,
              savedNotification.title,
            ) ?? savedNotification.title,
          data: navigation
            ? {
                ...(navigation.url && { url: navigation.url }),
                ...(navigation.screen && { screen: navigation.screen }),
                ...(navigation.params && {
                  params: JSON.stringify(navigation.params),
                }),
              }
            : undefined,
        },
      );
    }

    return formattedNotification;
  }

  async updateNotificationV2(
    notificationId: number,
    notification: UpdateNotificationV2Payload,
  ): Promise<NotificationV2Item> {
    const currentNotification = await this.notificationRepository.findOne({
      where: {
        id: Number(notificationId),
      },
    });

    if (!currentNotification) {
      throw new NotFoundException(
        `Notification id: ${notificationId} not found`,
      );
    }

    const notificationToSave: Partial<NotificationEntity> = {
      ...currentNotification,
      title: notification.title ?? currentNotification.title,
      content: notification.content ?? currentNotification.content,
      type: notification.type ?? currentNotification.type,
      link:
        notification.link !== undefined
          ? (notification.link ?? null)
          : (currentNotification.link ?? null),
      metadata:
        notification.metadata !== undefined
          ? (notification.metadata ?? null)
          : (currentNotification.metadata ?? null),
      recipientId:
        notification.recipientId !== undefined
          ? notification.recipientId
            ? Number(notification.recipientId)
            : null
          : (currentNotification.recipientId ?? null),
      recipientUserId:
        notification.recipientUserId !== undefined
          ? notification.recipientUserId
            ? Number(notification.recipientUserId)
            : null
          : (currentNotification.recipientUserId ?? null),
    };

    await this.validateNotificationRecipient({
      recipientId: notificationToSave.recipientId,
      recipientUserId: notificationToSave.recipientUserId,
    });

    const savedNotification =
      await this.notificationRepository.save(notificationToSave);

    const [formattedNotification] = await this.buildNotificationsV2Items([
      savedNotification,
    ]);

    return formattedNotification;
  }

  async deleteNotificationV2(
    notificationId: number,
  ): Promise<NotificationV2Item> {
    const notification = await this.notificationRepository.findOne({
      where: {
        id: Number(notificationId),
      },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification id: ${notificationId} not found`,
      );
    }

    const [formattedNotification] = await this.buildNotificationsV2Items([
      notification,
    ]);

    await this.notificationRepository.remove(notification);

    return formattedNotification;
  }

  async readAt(loginPayload: NotificationLoginPayload, notificationId: number) {
    try {
      const notification = await this.notificationRepository.findOne({
        where: {
          id: notificationId,
        },
      });

      if (!notification) {
        throw new NotFoundException(
          `Notification id: ${notificationId} not found`,
        );
      }

      const { recipientIds, recipientUserId } =
        await this.resolveNotificationAccess(loginPayload);

      const hasCustomerAccess =
        notification.recipientId !== null &&
        notification.recipientId !== undefined &&
        recipientIds.includes(notification.recipientId);

      const hasUserAccess =
        notification.recipientUserId !== null &&
        notification.recipientUserId !== undefined &&
        notification.recipientUserId === recipientUserId;

      if (!hasCustomerAccess && !hasUserAccess) {
        throw new UnauthorizedException();
      }

      notification.readAt = new Date();

      return this.notificationRepository.save({
        ...notification,
      });
    } catch (error) {
      throw new Error(error);
    }
  }

  async readAtV2(
    loginPayload: NotificationLoginPayload,
    notificationId: number,
  ): Promise<NotificationV2Item> {
    const notification = await this.readAt(loginPayload, notificationId);
    const [formattedNotification] = await this.buildNotificationsV2Items([
      notification,
    ]);

    return formattedNotification;
  }

  async readManyAtV2(
    loginPayload: NotificationLoginPayload,
    notificationIds: Array<number | string>,
  ): Promise<NotificationV2Item[]> {
    const normalizedNotificationIds = Array.from(
      new Set(
        (notificationIds ?? [])
          .map((notificationId) => this.extractNumericId(notificationId))
          .filter(
            (notificationId): notificationId is number =>
              notificationId !== null,
          ),
      ),
    );

    if (!normalizedNotificationIds.length) {
      throw new BadRequestException('notificationIds é obrigatório');
    }

    const { recipientIds, recipientUserId } =
      await this.resolveNotificationAccess(loginPayload);

    if (!recipientIds.length && !recipientUserId) {
      throw new UnauthorizedException();
    }

    const notifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.id IN (:...notificationIds)', {
        notificationIds: normalizedNotificationIds,
      })
      .andWhere(
        new Brackets((qb) => {
          if (recipientIds.length) {
            qb.where('notification.recipient_id IN (:...recipientIds)', {
              recipientIds,
            });
          }

          if (recipientUserId) {
            if (recipientIds.length) {
              qb.orWhere('notification.recipient_user_id = :recipientUserId', {
                recipientUserId,
              });
            } else {
              qb.where('notification.recipient_user_id = :recipientUserId', {
                recipientUserId,
              });
            }
          }
        }),
      )
      .orderBy('notification.created_at', 'DESC')
      .getMany();

    if (!notifications.length) {
      return [];
    }

    const readAt = new Date();
    const notificationsToUpdate = notifications.filter(
      (notification) => !notification.readAt,
    );

    if (notificationsToUpdate.length) {
      await this.notificationRepository.save(
        notificationsToUpdate.map((notification) => ({
          ...notification,
          readAt,
        })),
      );
    }

    const updatedNotifications = notifications.map((notification) => ({
      ...notification,
      readAt: notification.readAt ?? readAt,
    }));

    return this.buildNotificationsV2Items(updatedNotifications);
  }
}
