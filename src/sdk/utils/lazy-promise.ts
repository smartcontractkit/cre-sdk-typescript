/**
 * AbstractLazyPromise is a utility class that implements the Promise interface
 * but defers execution of the actual work until the promise is first accessed.
 *
* This is useful when you want to return a promise immediately without starting the work. 
 * For example, a CRE WASM binary will halt execution when await is called, so we want to
 * avoid doing the host await call until we know the caller wishes to block for the result with await..
 * Note that .then(), .catch(), and .finally() do not trigger cause execution.
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
export abstract class AbstractLazyPromise<T> implements Promise<T> {
	/**
	 * Creates a new LazyPromise
	 * @param factory - Function that returns the value or promise to resolve with
	 */
	constructor(private readonly promise: Promise<T>) {}

	private static isAwait(fnString: string): boolean {
		// await is a native function that's unnamed (aka you don't do await(...), it's built into the EMCA standard as a keyword).
		// Therefore, when toString is called on it, it shows up as "function () { [native code] }". From a quick read, whitespacing around the parentheses and braces can vary.
		// See https://tc39.es/ecma262/#sec-function.prototype.tostring for details
		
		const expected = "function(){[native code]}"
		let expectedIndex = 0
		let inSquares = false
		for (let i = 0; i < fnString.length && expectedIndex < expected.length; i++) {
			const char = fnString[i]
			if (char === '[') { inSquares = true }
			else if (char === ']') { inSquares = false }

			if (!inSquares && char === ' ' || char === '\t' || char === '\n' || char === '\r') {
				continue
			}
			if (char !== expected[expectedIndex]) {
				return false
			}
			expectedIndex++
		}
		
		return expectedIndex === expected.length
	}

	// forceResolve will block the call and force the promise to resolve
	// it should only be used by implementations of AbstractLazyPromise 
	// it's public so that they can all it on other implementations of the abstract class
	public abstract forceResolve(): void
	protected abstract wrap<U>(promise: Promise<U>): AbstractLazyPromise<U>

	/**
	 * Attaches callbacks for the resolution and/or rejection of the Promise.
	 * This triggers the lazy execution on an await if it hasn't started yet.
	 */
	 then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		const thenPromise = this.promise.then(onfulfilled, onrejected)
		if (AbstractLazyPromise.isAwait(onfulfilled?.toString() || "")) {
			console.log("Class name:", this.constructor.name)
			this.forceResolve()
			return thenPromise
		}

		return this.wrap(thenPromise)
	}

	/**
	 * Attaches a callback for only the rejection of the Promise.
	 * This does not trigger the lazy execution if it hasn't started yet.
	 */
	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
	): Promise<T | TResult> {
		return this.then(undefined, onrejected)
	}

	/**
	 * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected).
	 * This does not trigger the lazy execution if it hasn't started yet.
	 */
	finally(onfinally?: (() => void) | null): Promise<T> {
		return this.wrap(this.promise.finally(onfinally))
	}

	/**
	 * Required to make this behave like a native Promise.
	 * This allows instanceof checks and proper string representation.
	 */
	[Symbol.toStringTag] = 'Promise'
}

export class NestedLazyPromise<T, U> extends AbstractLazyPromise<T> {
	constructor(continuation: Promise<T>, private readonly underlying: AbstractLazyPromise<U>) {
		super(continuation)
	}

	public forceResolve(): void {
		this.underlying.forceResolve()
	}

	protected wrap<U>(promise: Promise<U>): AbstractLazyPromise<U> {
		return new NestedLazyPromise(promise, this)
	}
}

export class LazyPromise<T> extends AbstractLazyPromise<T> {
	/** The actual promise that gets created when work starts */
	private resolver!: (value: T) => void
	private rejector!: (reason?: any) => void

	/**
	 * Creates a new LazyPromise
	 * @param factory - Function that returns the value or promise to resolve with
	 */
	constructor(private readonly factory: () => T) {
		var tmpResolver: (value: T) => void
		var tmpRejector: (reason?: any) => void
			
		super(new Promise<T>((resolve, reject) => {
      		tmpResolver = resolve
      		tmpRejector = reject
		}))
		this.resolver = tmpResolver!
		this.rejector = tmpRejector!
	}

	public forceResolve() {
		try {
			this.resolver(this.factory())
		} catch (e) {
			this.rejector(e)
		}
	}

	protected wrap<U>(promise: Promise<U>): AbstractLazyPromise<U> {
		return new NestedLazyPromise(promise, this)
	}
}
