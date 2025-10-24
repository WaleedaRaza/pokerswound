/**
 * CommandBus Implementation
 */

import type { ICommandBus, ICommand, ICommandHandler } from '../../common/interfaces/ICommandBus';
import { CommandBusError } from '../../common/interfaces/ICommandBus';

export class CommandBus implements ICommandBus {
  private handlers = new Map<string, ICommandHandler<any>>();

  register<TCommand extends ICommand>(
    commandName: string,
    handler: ICommandHandler<TCommand>
  ): void {
    if (this.handlers.has(commandName)) {
      throw new CommandBusError(`Handler already registered for command: ${commandName}`);
    }
    this.handlers.set(commandName, handler);
  }

  async execute<TResult = any>(command: ICommand): Promise<TResult> {
    const handler = this.handlers.get(command.commandName);
    
    if (!handler) {
      throw new CommandBusError(`No handler registered for command: ${command.commandName}`);
    }

    try {
      return await handler.handle(command);
    } catch (error) {
      throw new CommandBusError(`Command execution failed: ${(error as Error).message}`);
    }
  }
}

