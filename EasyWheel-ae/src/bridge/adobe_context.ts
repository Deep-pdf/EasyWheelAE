/**
 * Adobe Context provider placeholder.
 * Exposes methods to fetch reference objects from After Effects runtime context in the future.
 */
export class AdobeContext {
  public getApplication(): any {
    return null;
  }

  public getProject(): any {
    return null;
  }

  public getSelection(): any {
    return null;
  }

  public getTimeline(): any {
    return null;
  }

  public getComposition(): any {
    return null;
  }

  public getActiveLayer(): any {
    return null;
  }
}

export const adobeContext = new AdobeContext();
