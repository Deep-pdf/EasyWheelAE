/**
 * Interface representing an executable Adobe extension command.
 */
export interface Command {
  id: string;
  execute(parameters: any, profile: string): Promise<{ success: boolean; message: string; errorCode?: string }>;
}

/**
 * Registry of all available commands in the extension.
 */
export class CommandRegistry {
  private static commands = new Map<string, Command>();

  /**
   * Registers a command handler.
   */
  public static register(command: Command) {
    this.commands.set(command.id, command);
    console.log(`[CommandRegistry] Registered command: ${command.id}`);
  }

  /**
   * Retrieves a command handler by ID.
   */
  public static get(id: string): Command | undefined {
    return this.commands.get(id);
  }
}
