import { useRef, useState } from 'react';

// Promise-based confirm dialog built on the native <dialog> element, which
// already traps focus, closes on Escape and returns focus when it closes.
// Usage: const [confirm, confirmDialog] = useConfirm();
//        if (await confirm({ title, body, confirmLabel, cancelLabel, danger })) { ... }
export default function useConfirm() {
  const dialogRef = useRef(null);
  const resolveRef = useRef(null);
  const [copy, setCopy] = useState({ title: '', body: '', confirmLabel: 'Confirm', cancelLabel: 'Cancel' });

  function confirm(options) {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setCopy(options);
      dialogRef.current.showModal();
    });
  }

  // Resolve synchronously from the click/Escape itself. The native `close` event
  // fires later, and could land after the next confirm() has already opened.
  function settle(result) {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(result);
  }

  function answer(result) {
    settle(result);
    dialogRef.current.close();
  }

  const dialog = (
    <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="confirm-title" onCancel={() => settle(false)}>
      <h2 id="confirm-title">{copy.title}</h2>
      {copy.body && <p>{copy.body}</p>}
      <div className="dialog-actions">
        {/* Cancel comes first so it gets the initial focus: the safe choice is the default. */}
        <button type="button" className="btn btn-secondary" onClick={() => answer(false)}>{copy.cancelLabel}</button>
        <button type="button" className={`btn ${copy.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => answer(true)}>
          {copy.confirmLabel}
        </button>
      </div>
    </dialog>
  );

  return [confirm, dialog];
}
