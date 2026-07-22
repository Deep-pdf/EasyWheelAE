"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adobeContext = exports.AdobeContext = void 0;
/**
 * Adobe Context provider placeholder.
 * Exposes methods to fetch reference objects from After Effects runtime context in the future.
 */
class AdobeContext {
    getApplication() {
        return null;
    }
    getProject() {
        return null;
    }
    getSelection() {
        return null;
    }
    getTimeline() {
        return null;
    }
    getComposition() {
        return null;
    }
    getActiveLayer() {
        return null;
    }
}
exports.AdobeContext = AdobeContext;
exports.adobeContext = new AdobeContext();
