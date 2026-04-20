/**
 * Toast store — Design Guide §6.10
 * Bottom-right, 320px wide, rounded-2xl shadow-card p-4
 * Colored left border (4px) matching semantic token
 * Auto-dismiss 4s for info/success; danger requires manual dismiss
 */

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  /** true = manual dismiss only (used for 'error' variant) */
  persistent?: boolean;
}

function createToastStore() {
  let toasts = $state<Toast[]>([]);

  function add(message: string, variant: ToastVariant = 'info', persistent = false): string {
    const id = crypto.randomUUID();
    const toast: Toast = { id, message, variant, persistent: persistent || variant === 'error' };
    toasts = [...toasts, toast];

    if (!toast.persistent) {
      setTimeout(() => remove(id), 4000);
    }

    return id;
  }

  function remove(id: string): void {
    toasts = toasts.filter((t) => t.id !== id);
  }

  function info(message: string) {
    return add(message, 'info');
  }

  function success(message: string) {
    return add(message, 'success');
  }

  function warning(message: string) {
    return add(message, 'warning');
  }

  function error(message: string) {
    return add(message, 'error', true);
  }

  return {
    get toasts() {
      return toasts;
    },
    add,
    remove,
    info,
    success,
    warning,
    error,
  };
}

export const toastStore = createToastStore();
