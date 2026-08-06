"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsxExecutor = exports.JSXExecutor = void 0;
const logger_1 = require("./logger");
/**
 * Executes ExtendScript (JSX) scripts in the After Effects context.
 * Currently simulates execution for Phase 10 runtime testing.
 */
class JSXExecutor {
    /**
     * Executes a string command inside the JSX engine.
     *
     * @param command ExtendScript source string to run.
     * @returns A promise resolving to the execution result.
     */
    async execute(command) {
        logger_1.Logger.info('JSXExecutor', `Evaluating command script: "${command}"`);
        return new Promise((resolve) => {
            try {
                console.log(`[Bridge]\nCalling evalScript:\n${command}`);
                if (typeof window !== 'undefined' && window.evalScriptInBrowser) {
                    window.evalScriptInBrowser(command, (result) => {
                        console.log('[Bridge]\nevalScript callback fired');
                        console.log(`[Bridge]\nResult:\n${result}`);
                        resolve({ success: true, message: 'Execution succeeded', result });
                    });
                }
                else if (typeof window !== 'undefined' && window.__adobe_cep__) {
                    window.__adobe_cep__.evalScript(command, (result) => {
                        console.log('[Bridge]\nevalScript callback fired');
                        console.log(`[Bridge]\nResult:\n${result}`);
                        resolve({ success: true, message: 'Execution succeeded', result });
                    });
                }
                else {
                    console.log('[Bridge]\nError: CEP environment not available');
                    resolve({ success: false, message: 'CEP environment not available' });
                }
            }
            catch (e) {
                console.log(`[Bridge]\nException: ${e.message}`);
                resolve({ success: false, message: e.message || 'evalScript failed' });
            }
        });
    }
}
exports.JSXExecutor = JSXExecutor;
exports.jsxExecutor = new JSXExecutor();
