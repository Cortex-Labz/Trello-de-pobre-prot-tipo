import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { NotificationData } from '../../types/notification';
import { useAuthStore } from '../../store/authStore';
import { NotificationToastContainer } from './NotificationToast';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export default function NotificationProvider() {
  const [toastNotifications, setToastNotifications] = useState<NotificationData[]>([]);
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!user || !token) return;

    const socket: Socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('🔔 Connected to notification service');
      socket.emit('join', `user:${user.id}`);
    });

    // Escutar novas notificações
    socket.on('notification', (notification: NotificationData) => {
      console.log('📬 New notification:', notification);

      // Adicionar ao toast
      setToastNotifications((prev) => [...prev, notification]);

      // Mostrar notificação nativa do browser
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nova notificação - VersatlyTask', {
          body: notification.content,
          icon: '/favicon.ico',
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from notification service');
    });

    // Pedir permissão para notificações nativas
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  const removeToast = (id: string) => {
    setToastNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  return <NotificationToastContainer notifications={toastNotifications} onRemove={removeToast} />;
}
