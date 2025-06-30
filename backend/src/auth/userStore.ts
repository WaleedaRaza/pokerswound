import { promises as fs } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DATA_ACCOUNT_PATH || "../data/account.json"

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

async function load(): Promise<UserRecord[]> {
  try { return JSON.parse(await fs.readFile(DB_PATH, 'utf8')); }
  catch { return []; }
}

async function save(users: UserRecord[]) {
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2));
}

// CRUD helpers
export async function findByEmail(email: string) {
  const users = await load();
  return users.find(u => u.email === email);
}

export async function add(user: UserRecord) {
  const users = await load();
  users.push(user);
  await save(users);
}
