// src/auth/userStore.ts
import prisma from '../prisma';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export async function findByEmail(
  email: string
): Promise<UserRecord | null> {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      createdAt: true,
    },
  });
}

export async function add(user: {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date | string;
}): Promise<UserRecord> {
  return prisma.user.create({
    data: {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      createdAt:
        typeof user.createdAt === 'string'
          ? new Date(user.createdAt)
          : user.createdAt,
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      createdAt: true,
    },
  });
}
