import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fluid } from '@/lib/fluid';

export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  /** Milliseconds on screen; default 4 seconds. */
  duration?: number;
}

interface ToastContextValue {
  showToast(message: string, options?: ToastOptions): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ActiveToast {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Small bottom notification, with an optional action such as Undo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setToast(null);
  }, [clearTimer]);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      clearTimer();
      setToast({ message, actionLabel: options?.actionLabel, onAction: options?.onAction });
      timer.current = setTimeout(() => setToast(null), options?.duration ?? 4000);
    },
    [clearTimer]
  );

  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <ThemedView
            testID="toast"
            style={[styles.toast, { borderColor: theme.border }]}>
            <ThemedText type="small" style={styles.message}>
              {toast.message}
            </ThemedText>
            {toast.actionLabel ? (
              <Button
                label={toast.actionLabel}
                variant="ghost"
                testID="toast-action"
                onPress={() => {
                  toast.onAction?.();
                  dismiss();
                }}
              />
            ) : null}
          </ThemedView>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: Spacing.four,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    maxWidth: fluid(560),
    // `boxShadow` is the modern, cross-platform way to draw a shadow;
    // the old shadow* props are deprecated (and noisy in the console).
    boxShadow: '0 4px 16px rgba(47, 58, 56, 0.18)',
  },
  message: {
    flexShrink: 1,
  },
});
