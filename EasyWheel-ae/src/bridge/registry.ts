import { Logger } from './logger';

/**
 * Interface representing an executable Adobe After Effects extension command.
 */
export interface Command {
  /**
   * The identifier of the command (e.g. "ping", "easy_ease").
   */
  id: string;

  /**
   * Executes the command.
   * 
   * @param parameters Input parameters payload.
   * @param profile The active profile.
   * @returns Result of execution.
   */
  execute(parameters: any, profile: string): Promise<{
    success: boolean;
    message: string;
    errorCode?: string;
  }>;
}

/**
 * Centrally manages registration and resolution of commands.
 */
export class CommandRegistry {
  private static commands = new Map<string, Command>();

  /**
   * Registers a command handler.
   * 
   * @param command Command handler instance.
   */
  public static register(command: Command) {
    this.commands.set(command.id, command);
    Logger.info('CommandRegistry', `Registered command: "${command.id}"`);
  }

  /**
   * Resolves a command handler by ID.
   * 
   * @param id Command identifier.
   * @returns Resolves to the Command handler if found, or undefined.
   */
  public static get(id: string): Command | undefined {
    return this.commands.get(id);
  }
}
