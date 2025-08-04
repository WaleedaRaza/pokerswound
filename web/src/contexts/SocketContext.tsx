import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinGame: (gameId: string) => void;
  leaveGame: (gameId: string) => void;
  sendAction: (gameId: string, handId: string, action: string, amount?: number) => void;
  sendChatMessage: (gameId: string, message: string) => void;
  sendTyping: (gameId: string, isTyping: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Connection failed. Please try again.');
    });

    // Game events
    socket.on('game-updated', (game) => {
      console.log('Game updated:', game);
      // This will be handled by the GameContext
    });

    socket.on('hand-started', (hand) => {
      console.log('Hand started:', hand);
      toast.success('New hand started!');
    });

    socket.on('hand-ended', (data) => {
      console.log('Hand ended:', data);
      toast.success(`Hand ended! Winners: ${data.winners.join(', ')}`);
    });

    socket.on('player-joined', (player) => {
      console.log('Player joined:', player);
      toast.success(`${player.user.username} joined the game`);
    });

    socket.on('player-left', (data) => {
      console.log('Player left:', data);
      toast.info('A player left the game');
    });

    socket.on('action-performed', (action) => {
      console.log('Action performed:', action);
      // This will be handled by the GameContext
    });

    socket.on('chat-message-received', (message) => {
      console.log('Chat message received:', message);
      // This will be handled by the GameContext
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'An error occurred');
    });

    socket.on('notification', (notification) => {
      console.log('Notification:', notification);
      toast(notification.message, {
        icon: notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️',
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, token]);

  const joinGame = (gameId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join-game', { gameId });
    } else {
      toast.error('Not connected to server');
    }
  };

  const leaveGame = (gameId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave-game', { gameId });
    }
  };

  const sendAction = (gameId: string, handId: string, action: string, amount?: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('player-action', {
        gameId,
        handId,
        action,
        amount,
      });
    } else {
      toast.error('Not connected to server');
    }
  };

  const sendChatMessage = (gameId: string, message: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('chat-message', {
        gameId,
        message,
      });
    } else {
      toast.error('Not connected to server');
    }
  };

  const sendTyping = (gameId: string, isTyping: boolean) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing', {
        gameId,
        isTyping,
      });
    }
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    joinGame,
    leaveGame,
    sendAction,
    sendChatMessage,
    sendTyping,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
} 