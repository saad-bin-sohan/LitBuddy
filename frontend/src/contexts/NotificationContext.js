// frontend/src/contexts/NotificationContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { fetchNotifications } from '../api/notificationApi';
import { Client } from '@stomp/stompjs';
import { getStompClient, subscribe, unsubscribe } from '../stompClient';

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  refresh: async () => {},
});

export const NotificationProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const normalize = (res) => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.notifications)) return res.notifications;
    if (Array.isArray(res.data)) return res.data;
    return [];
  };

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetchNotifications();
      const list = normalize(res);
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Failed to refresh notifications', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Use the centralized STOMP client
    const client = getStompClient();
    if (!client || !client.connected) {
      // Wait for client to be ready
      const checkClient = setInterval(() => {
        const readyClient = getStompClient();
        if (readyClient && readyClient.connected) {
          clearInterval(checkClient);
          setupNotificationSubscription(readyClient);
        }
      }, 100);
      return () => clearInterval(checkClient);
    }

    setupNotificationSubscription(client);

    // Load history once
    refresh();

    return () => {
      // Cleanup subscriptions
      unsubscribe(`/topic/user.${user._id}.notifications`);
    };
  }, [user, token, refresh]);

  const setupNotificationSubscription = (client) => {
    subscribe(`/topic/user.${user._id}.notifications`, (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
};
