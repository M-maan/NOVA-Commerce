import { api } from './client';
export type Notification = { id: string; type: string; title: string; message: string; readStatus: boolean; createdAt: string };
export const notificationsApi = {
  list: () => api.get<Notification[]>('/notifications'),
  read: (id: string) => api.patch<Notification>(`/notifications/${id}/read`, {}),
  preferences: () => api.get<{ emailEnabled: boolean; notificationEnabled: boolean }>('/notification-preferences'),
  updatePreferences: (body: { emailEnabled?: boolean; notificationEnabled?: boolean }) => api.patch('/notification-preferences', body),
};
