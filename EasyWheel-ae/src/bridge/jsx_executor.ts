import { Logger } from './logger';

export interface JSXExecutionResult {
  success: boolean;
  message: string;
  result?: any;
}

/**
 * Executes ExtendScript (JSX) scripts in the After Effects context.
 * Currently simulates execution for Phase 10 runtime testing.
 */
export class JSXExecutor {
  /**
   * Executes a string command inside the JSX engine.
   * 
   * @param command ExtendScript source string to run.
   * @returns A promise resolving to the execution result.
   */
  public async execute(command: string): Promise<JSXExecutionResult> {
    Logger.info('JSXExecutor', `Evaluating command script: "${command}"`);
    
    return new Promise((resolve) => {
      try {
        console.log(`[Bridge]\nCalling evalScript:\n${command}`);
        
        if (typeof window !== 'undefined' && (window as any).evalScriptInBrowser) {
          (window as any).evalScriptInBrowser(command, (result: any) => {
            console.log('[Bridge]\nevalScript callback fired');
            console.log(`[Bridge]\nResult:\n${result}`);
            resolve({ success: true, message: 'Execution succeeded', result });
          });
        } else if (typeof window !== 'undefined' && (window as any).__adobe_cep__) {
          (window as any).__adobe_cep__.evalScript(command, (result: any) => {
            console.log('[Bridge]\nevalScript callback fired');
            console.log(`[Bridge]\nResult:\n${result}`);
            resolve({ success: true, message: 'Execution succeeded', result });
          });
        } else {
          console.log('[Bridge]\nError: CEP environment not available');
          resolve({ success: false, message: 'CEP environment not available' });
        }
      } catch (e: any) {
        console.log(`[Bridge]\nException: ${e.message}`);
        resolve({ success: false, message: e.message || 'evalScript failed' });
      }
    });
  }
}

export const jsxExecutor = new JSXExecutor();
