/**
 * QueryBus Implementation
 */

import type { IQueryBus, IQuery, IQueryHandler } from '../../common/interfaces/IQueryBus';
import { QueryBusError } from '../../common/interfaces/IQueryBus';

export class QueryBus implements IQueryBus {
  private handlers = new Map<string, IQueryHandler<any, any>>();

  register<TQuery extends IQuery<TResult>, TResult = any>(
    queryName: string,
    handler: IQueryHandler<TQuery, TResult>
  ): void {
    if (this.handlers.has(queryName)) {
      throw new QueryBusError(`Handler already registered for query: ${queryName}`);
    }
    this.handlers.set(queryName, handler);
  }

  async execute<TResult = any>(query: IQuery<TResult>): Promise<TResult> {
    const handler = this.handlers.get(query.queryName);
    
    if (!handler) {
      throw new QueryBusError(`No handler registered for query: ${query.queryName}`);
    }

    try {
      return await handler.handle(query);
    } catch (error) {
      throw new QueryBusError(`Query execution failed: ${(error as Error).message}`);
    }
  }
}

