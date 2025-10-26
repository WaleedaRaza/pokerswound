"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBus = void 0;
const ICommandBus_1 = require("../../common/interfaces/ICommandBus");
class CommandBus {
    constructor() {
        this.handlers = new Map();
    }
    register(commandName, handler) {
        if (this.handlers.has(commandName)) {
            throw new ICommandBus_1.CommandBusError(`Handler already registered for command: ${commandName}`);
        }
        this.handlers.set(commandName, handler);
    }
    async execute(command) {
        const handler = this.handlers.get(command.commandName);
        if (!handler) {
            throw new ICommandBus_1.CommandBusError(`No handler registered for command: ${command.commandName}`);
        }
        try {
            return await handler.handle(command);
        }
        catch (error) {
            throw new ICommandBus_1.CommandBusError(`Command execution failed: ${error.message}`);
        }
    }
}
exports.CommandBus = CommandBus;
