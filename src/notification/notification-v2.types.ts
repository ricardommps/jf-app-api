export type NotificationV2Metadata = {
  workoutTitle?: string | null;
  workoutSubtitle?: string | null;
  referenceDate?: string | null;
  workoutKind?: string | null;
  finishedId?: number | string | null;
  workoutId?: number | string | null;
  workoutsId?: number | string | null;
  invoiceId?: number | string | null;
  amount?: string | null;
  icon?: string | null;
  actionLabel?: string | null;
  actionKind?: 'reply' | 'download' | 'open' | 'mark-as-read' | null;
  navigation?: {
    url?: string | null;
    screen?: string | null;
    params?: Record<string, unknown> | string | null;
  } | null;
  [key: string]: unknown;
};

export type NotificationV2Navigation = {
  url: string | null;
  screen: string | null;
  params: Record<string, unknown> | null;
};

export type NotificationV2Action = {
  label: string;
  kind: 'reply' | 'download' | 'open' | 'mark-as-read';
};

export type NotificationV2Item = {
  id: number;
  type: string;
  variant: string;
  title: string;
  content: string | null;
  referenceDate: string | null;
  referenceDateLabel: string | null;
  createdAt: Date;
  createdAtLabel: string;
  readAt: Date | null;
  link: string | null;
  icon: string;
  action: NotificationV2Action | null;
  navigation: NotificationV2Navigation | null;
  metadata: NotificationV2Metadata | null;
};

export type CreateNotificationV2Payload = {
  recipientId?: number | string | null;
  recipientUserId?: number | string | null;
  title: string;
  content?: string | null;
  type: string;
  link?: string | null;
  metadata?: NotificationV2Metadata | null;
  sendPush?: boolean;
};

export type UpdateNotificationV2Payload = {
  recipientId?: number | string | null;
  recipientUserId?: number | string | null;
  title?: string;
  content?: string | null;
  type?: string;
  link?: string | null;
  metadata?: NotificationV2Metadata | null;
};

export type ReadNotificationsV2Payload = {
  notificationIds: Array<number | string>;
};
