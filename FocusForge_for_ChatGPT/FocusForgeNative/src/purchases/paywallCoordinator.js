// Superwall may leave registerPlacement pending after a gated dismissal/error.
// Settle the bridge from lifecycle callbacks, and coalesce competing UI requests.
export function createPaywallCoordinator() {
  let pending = null;
  const finish = (result) => {
    if (!pending) return;
    const request = pending;
    pending = null;
    request.resolve(result);
  };
  return {
    open(register, placement) {
      if (pending) return pending.promise;
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      const request = { promise, resolve };
      pending = request;
      Promise.resolve().then(() => register(placement)).then(
        () => { if (pending === request) finish({ success: true }); },
        () => { if (pending === request) finish({ success: false, error: 'Plans could not be opened. Please check your connection and try again.' }); }
      );
      return promise;
    },
    dismissed() { finish({ success: true, dismissed: true }); },
    skipped() { finish({ success: true, skipped: true }); },
    failed() { finish({ success: false, error: 'Plans could not be opened. Please check your connection and try again.' }); },
    dispose() { finish({ success: false, error: 'Plans closed. Please try again.' }); },
  };
}
