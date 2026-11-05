import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
  } from 'react';
  import Notification from '../components/Notification';
  
  interface NotificationContextProps {
    showNotification: (
      message: string,
      type: 'success' | 'error' | 'warning' | 'info',
      duration?: number
    ) => void;
  }
  
  const NotificationContext = createContext<NotificationContextProps | undefined>(
    undefined
  );
  
  interface NotificationProviderProps {
    children: ReactNode;
  }
  
  export const NotificationProvider: React.FC<NotificationProviderProps> = ({
    children,
  }) => {
    const [notifications, setNotifications] = useState<
      {
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
        duration?: number;
        id: number;
      }[]
    >([]);
    let nextId = 0;
  
    const showNotification = useCallback(
      (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        duration?: number
      ) => {
        const id = nextId++;
        setNotifications((prev) => [
          ...prev,
          { message, type, duration, id },
        ]);
      },
      []
    );
  
    const removeNotification = useCallback((id: number) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);
  
    return (
      <NotificationContext.Provider value={{ showNotification }}>
        {children}
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </NotificationContext.Provider>
    );
  };
  
  export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
      throw new Error(
        'useNotification must be used within a NotificationProvider'
      );
    }
    return context;
  };
  