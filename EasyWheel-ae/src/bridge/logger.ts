/**
 * Simple structured console logger for the After Effects extension.
 */
export class Logger {
  private static getTimestamp(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  public static info(module: string, message: string) {
    console.log(`[${this.getTimestamp()}] [INFO] [${module}] ${message}`);
  }

  public static warn(module: string, message: string) {
    console.warn(`[${this.getTimestamp()}] [WARN] [${module}] ${message}`);
  }

  public static error(module: string, message: string, error?: any) {
    if (error) {
      console.error(`[${this.getTimestamp()}] [ERROR] [${module}] ${message}`, error);
    } else {
      console.error(`[${this.getTimestamp()}] [ERROR] [${module}] ${message}`);
    }
  }

  public static debug(module: string, message: string) {
    console.debug(`[${this.getTimestamp()}] [DEBUG] [${module}] ${message}`);
  }
}
