// services/player.ts
export interface LobbyPlayer {
  id:       string;
  username: string;
  avatar:   string | null;
  joinedAt: string;
  isDealer: boolean;
}

export async function fetchLobbyPlayers(gameId: string): Promise<LobbyPlayer[]> {
  const res = await fetch(`http://localhost:3001/api/player/list/${gameId}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to fetch lobby players');
  }
  const { players } = await res.json() as { success: true; players: LobbyPlayer[] };
  return players;
}
