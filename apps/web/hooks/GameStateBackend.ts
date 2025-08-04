export function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

export async function fetchUuid(): Promise<string> {
  const res = await fetch('http://localhost:3001/api/getadminuuid', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch UUID');
  const { adminUuid } = await res.json();
  return adminUuid;
}

export async function getUuid(): Promise<string> {
  let uuid = getCookie('uuid');
  if (!uuid) {
    uuid = await fetchUuid();
    setCookie('uuid', uuid);
  }
  return uuid;
}

export interface GamePayload {
  name:        string;
  maxPlayers?: number;
  minPlayers?: number;
  smallBlind?: number;
  bigBlind?:   number;
  buyIn?:      number;
  code?:       number;
}

export async function createGameAndAdmin(payload: GamePayload) {
  // 1) CREATE GAME
  const uuid = await getUuid();
  const createRes = await fetch('http://localhost:3001/api/game/create', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      adminUuid: uuid,
      code:      payload.code ?? 0,
    }),
  });
  if (!createRes.ok) throw new Error('Failed to create game');
  const { game } = await createRes.json();

  setCookie('gameId', game.id);

  // 2) REGISTER ADMIN AS PLAYER
  const { player } = await createPlayer({
    gameId:   game.id,
    userId:   game.adminUuid,
    position: 0,
    chips:    payload.buyIn ?? 0,
    isDealer: true,
  });

  return { game, player };
}



// services/player.ts
export interface CreatePlayerPayload {
  gameId:    string;
  userId:    string;
  position?: number;
  chips?:    number;
  isDealer?: boolean;
}

export async function createPlayer(payload: CreatePlayerPayload) {
  const res = await fetch('http://localhost:3001/api/player/create', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to create player');
  }
  return res.json() as Promise<{ success: true; player: any }>;
}


export interface GameInfo {
  id:               string;
  name:             string;
  status:           string;
  maxPlayers:       number;
  minPlayers:       number;
  smallBlind:       number;
  bigBlind:         number;
  buyIn:            number;
  createdAt:        string;
  updatedAt:        string;
  startedAt:        string | null;
  endedAt:          string | null;
  entropyHash:      string | null;
  shuffleTimestamp: string | null;
  adminUuid:        string;
  code:             number;
}

export async function fetchGames(): Promise<GameInfo[]> {
  const res = await fetch('http://localhost:3001/api/game/fetch', {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || 'Failed to fetch games');
  }
  const { games } = await res.json() as { success: boolean; games: GameInfo[] };
  return games;
}

export async function joinGameById(gameId: string) {
  const uuid = await getUuid();

  // tell the backend “join me into this game”
  const res = await fetch('http://localhost:3001/api/game/join', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, userUuid: uuid }),
  });
  if (!res.ok) throw new Error('Failed to join game');
  const { game, player } = await res.json() as { game: GameInfo; player: any };

  // persist only the game ID (we already have uuid for the player)
  setCookie('gameId', game.id);

  return { game, player };
}