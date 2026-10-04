import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type View as ViewType,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isPointInsideRect, type Rect } from '@/lib/geometry';

/**
 * Dragging a row onto a target, using the responder system so it works with a
 * mouse or a finger and needs no extra dependency.
 *
 * Dragging starts from an explicit handle rather than the whole row: rows hold
 * their own buttons, and the responder system hands a press to whichever
 * control is under the pointer. A handle is unambiguous — and it is the cue
 * that the row can be picked up at all.
 *
 * The target measures itself in window coordinates; releasing inside those
 * bounds counts as a drop, and the target lights up while the pointer is over it.
 *
 * Two web details matter for this to work at all with a mouse:
 *   - the handle and the row must be `userSelect: 'none'`, or the browser
 *     starts selecting the text under the pointer instead, which cancels the
 *     responder and snaps the row back the moment it leaves its box;
 *   - the target re-measures when a drag starts, so a page that has been
 *     scrolled since it was laid out is still tested against its real bounds.
 */

export interface DropZone {
  /**
   * A callback ref: React hands it the node after layout. (A ref *object*
   * would have to be read during render, which the compiler forbids.)
   */
  setNode: (node: ViewType | null) => void;
  highlighted: boolean;
  /** Re-measure after layout or scrolling. */
  measure: () => void;
  contains: (x: number, y: number) => boolean;
  setHighlighted: (value: boolean) => void;
}

export function useDropZone(): DropZone {
  const node = useRef<ViewType | null>(null);
  const rect = useRef<Rect | null>(null);
  const [highlighted, setHighlighted] = useState(false);

  const setNode = useCallback((next: ViewType | null) => {
    node.current = next;
  }, []);

  const measure = useCallback(() => {
    node.current?.measureInWindow?.((x, y, width, height) => {
      rect.current = { x, y, width, height };
    });
  }, []);

  return {
    setNode,
    highlighted,
    measure,
    setHighlighted,
    contains: (x, y) => {
      const inside = isPointInsideRect(x, y, rect.current);
      setHighlighted(inside);
      return inside;
    },
  };
}

export type DragHandleProps = {
  onStartShouldSetResponder: () => boolean;
  onMoveShouldSetResponder: () => boolean;
  onResponderGrant: (event: PointerLike) => void;
  onResponderMove: (event: PointerLike) => void;
  onResponderRelease: (event: PointerLike) => void;
  onResponderTerminate: () => void;
};

interface PointerLike {
  nativeEvent: { pageX: number; pageY: number };
}

/**
 * Wraps a row so its handle can pick it up and drop it on a target.
 *
 * `renderHandle` receives the responder props for the grab area; `children`
 * is the rest of the row, which travels with the drag.
 */
export function Draggable({
  onDrop,
  onDragStart,
  onDragMove,
  renderHandle,
  children,
  testID,
}: {
  onDrop: (point: { x: number; y: number }) => void;
  /** Called when a drag begins — the drop target re-measures itself here. */
  onDragStart?: () => void;
  /** Called as the pointer moves, so the target can light up under it. */
  onDragMove?: (point: { x: number; y: number }) => void;
  renderHandle: (handleProps: DragHandleProps) => ReactNode;
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  // All of this is state rather than refs: it is read while rendering, and
  // the React Compiler (rightly) refuses ref reads outside effects/handlers.
  const [pan] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [grabPoint, setGrabPoint] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const settle = useCallback(() => {
    pan.setValue({ x: 0, y: 0 });
    setGrabPoint(null);
    setDragging(false);
  }, [pan]);

  const handleProps = useMemo<DragHandleProps>(
    () => ({
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: () => true,
      onResponderGrant: (event) => {
        onDragStart?.();
        setGrabPoint({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
        setDragging(true);
      },
      onResponderMove: (event) => {
        if (!grabPoint) return;
        // Follow the pointer: the row moves by however far it has travelled.
        pan.setValue({
          x: event.nativeEvent.pageX - grabPoint.x,
          y: event.nativeEvent.pageY - grabPoint.y,
        });
        onDragMove?.({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
      },
      onResponderRelease: (event) => {
        onDrop({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
        settle();
      },
      onResponderTerminate: () => settle(),
    }),
    [grabPoint, onDragMove, onDragStart, onDrop, pan, settle]
  );

  return (
    <View testID={testID} style={dragging ? styles.wrapDragging : styles.wrap}>
      <Animated.View
        style={[
          dragging && { boxShadow: `0 12px 24px ${theme.shadow}` },
          { transform: [...pan.getTranslateTransform()] },
        ]}>
        <View
          style={[
            styles.row,
            {
              borderColor: dragging ? theme.primary : theme.border,
              backgroundColor: dragging ? theme.backgroundSelected : 'transparent',
            },
            dragging ? GRABBING_CURSOR : GRAB_CURSOR,
          ]}>
          {renderHandle(handleProps)}
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 1,
  },
  wrapDragging: {
    zIndex: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    paddingVertical: Spacing.oneHalf,
    paddingHorizontal: Spacing.two,
    // Without this the browser selects the text under the pointer as soon as
    // the mouse moves, which takes the gesture away from the row.
    userSelect: 'none',
  },
});

// `cursor` is a react-native-web style (React Native itself ignores it), and
// this version's types do not know it — hence the casts.
const GRAB_CURSOR = { cursor: 'grab' } as unknown as ViewStyle;
const GRABBING_CURSOR = { cursor: 'grabbing' } as unknown as ViewStyle;
