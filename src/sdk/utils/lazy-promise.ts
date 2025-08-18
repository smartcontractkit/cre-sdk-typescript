/**
 * LazyPromise is a utility class that implements the Promise interface
 * but defers execution of the actual work until the promise is first accessed.
 *
 * This is useful when you want to return a promise immediately without
 * starting the async work, but ensure the work begins as soon as someone
 * tries to await, .then(), .catch(), or .finally() the promise.
 *
 * Example usage:
 * ```typescript
 * const lazyPromise = new LazyPromise(() => {
 *   // This expensive operation won't start until the promise is accessed
 *   return fetch('/api/data');
 * });
 *
 * // Promise is returned immediately, no work done yet
 * // Work starts when you await it:
 * const result = await lazyPromise;
 * ```
 *
 * This abstraction has been created for calling capabilities in a non-blocking way.
 */
export class LazyPromise<T> implements Promise<T> {
  /** Tracks whether the factory function has been executed */
  private started = false;

  /** The actual promise that gets created when work starts */
  private promise!: Promise<T>;

  /**
   * Creates a new LazyPromise
   * @param factory - Function that returns the value or promise to resolve with
   */
  constructor(private readonly factory: () => T | Promise<T>) {}

  /**
   * Ensures the factory function has been executed and the promise is created.
   * This is called by all promise methods (.then, .catch, .finally) to start the work.
   */
  private ensureStarted() {
    if (!this.started) {
      this.started = true;
      try {
        const result = this.factory();
        this.promise = Promise.resolve(result);
      } catch (err) {
        this.promise = Promise.reject(err);
      }
    }
  }

  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   * This triggers the lazy execution if it hasn't started yet.
   */
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    this.ensureStarted();
    return this.promise.then(onfulfilled, onrejected);
  }

  /**
   * Attaches a callback for only the rejection of the Promise.
   * This triggers the lazy execution if it hasn't started yet.
   */
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    this.ensureStarted();
    return this.promise.catch(onrejected);
  }

  /**
   * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected).
   * This triggers the lazy execution if it hasn't started yet.
   */
  finally(onfinally?: (() => void) | null): Promise<T> {
    this.ensureStarted();
    return this.promise.finally(onfinally);
  }

  /**
   * Required to make this behave like a native Promise.
   * This allows instanceof checks and proper string representation.
   */
  [Symbol.toStringTag] = "Promise";
}
