import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Game, Hand, HandAction } from '../../../types';
import { useSocket } from './SocketContext';

interface GameState {
  currentGame: Game | null;
  currentHand: Hand | null;
  isLoading: boolean;
  error: string | null;
}

type GameAction =
  | { type: 'SET_GAME'; payload: Game }
  | { type: 'UPDATE_GAME'; payload: Partial<Game> }
  | { type: 'SET_HAND'; payload: Hand }
  | { type: 'ADD_ACTION'; payload: HandAction }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_GAME' };

const initialState: GameState = {
  currentGame: null,
  currentHand: null,
  isLoading: false,
  error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_GAME':
      return {
        ...state,
        currentGame: action.payload,
        error: null,
      };
    case 'UPDATE_GAME':
      return {
        ...state,
        currentGame: state.currentGame ? { ...state.currentGame, ...action.payload } : null,
        error: null,
      };
    case 'SET_HAND':
      return {
        ...state,
        currentHand: action.payload,
        error: null,
      };
    case 'ADD_ACTION':
      return {
        ...state,
        currentHand: state.currentHand ? {
          ...state.currentHand,
          actions: [...state.currentHand.actions, action.payload]
        } : null,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_GAME':
      return {
        ...state,
        currentGame: null,
        currentHand: null,
        error: null,
      };
    default:
      return state;
  }
}

interface GameContextType extends GameState {
  joinGame: (gameId: string) => void;
  leaveGame: (gameId: string) => void;
  sendAction: (action: string, amount?: number) => void;
  sendChatMessage: (message: string) => void;
  clearGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket, joinGame: socketJoinGame, leaveGame: socketLeaveGame, sendAction: socketSendAction, sendChatMessage: socketSendChatMessage } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for game updates
    socket.on('game-updated', (game: Game) => {
      dispatch({ type: 'SET_GAME', payload: game });
    });

    // Listen for hand updates
    socket.on('hand-started', (hand: Hand) => {
      dispatch({ type: 'SET_HAND', payload: hand });
    });

    // Listen for action updates
    socket.on('action-performed', (action: HandAction) => {
      dispatch({ type: 'ADD_ACTION', payload: action });
    });

    // Listen for errors
    socket.on('error', (error: { message: string }) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    });

    return () => {
      socket.off('game-updated');
      socket.off('hand-started');
      socket.off('action-performed');
      socket.off('error');
    };
  }, [socket]);

  const joinGame = (gameId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    socketJoinGame(gameId);
  };

  const leaveGame = (gameId: string) => {
    socketLeaveGame(gameId);
    dispatch({ type: 'CLEAR_GAME' });
  };

  const sendAction = (action: string, amount?: number) => {
    if (!state.currentGame || !state.currentHand) return;
    
    socketSendAction(
      state.currentGame.id,
      state.currentHand.id,
      action,
      amount
    );
  };

  const sendChatMessage = (message: string) => {
    if (!state.currentGame) return;
    
    socketSendChatMessage(state.currentGame.id, message);
  };

  const clearGame = () => {
    dispatch({ type: 'CLEAR_GAME' });
  };

  const value: GameContextType = {
    ...state,
    joinGame,
    leaveGame,
    sendAction,
    sendChatMessage,
    clearGame,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
} 