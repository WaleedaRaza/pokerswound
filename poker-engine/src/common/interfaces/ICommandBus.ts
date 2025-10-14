/**
 * CommandBus Interface - CQRS Command Pattern
 */

export interface ICommand {
  readonly commandName: string;
}

export interface ICommandHandler<TCommand extends ICommand, TResult = any> {
  handle(command: TCommand): Promise<TResult>;
}

export interface ICommandBus {
  execute<TResult = any>(command: ICommand): Promise<TResult>;
  register<TCommand extends ICommand>(
    commandName: string,
    handler: ICommandHandler<TCommand>
  ): void;
}

export class CommandBusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandBusError';
  }
}

