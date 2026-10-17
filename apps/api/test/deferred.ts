/** A test-controlled promise whose callbacks exist immediately. */
export function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => {
    throw new Error('Promise not initialized');
  };
  let reject: (reason?: unknown) => void = () => {
    throw new Error('Promise not initialized');
  };
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
