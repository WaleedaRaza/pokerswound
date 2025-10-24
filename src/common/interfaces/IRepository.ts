/**
 * Repository Pattern Interfaces
 */

export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface IGameRepository extends IRepository<any> {
  findByRoomId(roomId: string): Promise<any[]>;
  findIncomplete(): Promise<string[]>;
}

