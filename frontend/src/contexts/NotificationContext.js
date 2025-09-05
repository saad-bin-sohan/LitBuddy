// frontend/src/contexts/NotificationContext.js
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { fetchNotifications, markNotificationRead } from '../api/notificationApi';
import { initStomp, getStompClient, subscribe, unsubscribe } from '../stompClient';

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  refresh: async () => {},
});

export const NotificationProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [subDest, setSubDest] = useState(null);

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
      if (subDest) unsubscribe(subDest);
      setSubDest(null);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Ensure STOMP is initialized with current token
    initStomp(token);

    const desiredDest = `/topic/user.${user._id}.notifications`;
    const trySubscribe = () => {
      const client = getStompClient();
      if (client && client.connected) {
        if (subDest && subDest !== desiredDest) unsubscribe(subDest);
        setupNotificationSubscription(client, desiredDest);
        setSubDest(desiredDest);
        // Load history once
        refresh();
        return true;
      }
      return false;
    };

    if (!trySubscribe()) {
      const interval = setInterval(() => {
        if (trySubscribe()) clearInterval(interval);
      }, 150);
      return () => clearInterval(interval);
    }

    return () => {
      if (desiredDest) unsubscribe(desiredDest);
    };
  }, [user, token, refresh]);

  const setupNotificationSubscription = (client, destination) => {
    subscribe(destination, (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
  };

  const markRead = useCallback(async (id) => {
    try {
      const updated = await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      return updated;
    } catch (err) {
      console.error('Failed to mark notification read', err);
      throw err;
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refresh, markRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
