import React, { useRef, useMemo } from 'react';
import {
  Animated,
  PanResponder,
  View,
  Text,
  StyleSheet,
  Vibration,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DraggableItemProps {
  index: number;
  totalCount: number;
  enabled?: boolean;
  itemHeight?: number;
  listRef?: React.RefObject<any>;
  scrollOffsetRef?: React.RefObject<number>;
  activeDragIndex: number | null;
  hoverIndex: number | null;
  onDragStart: (index: number) => void;
  onHoverChange: (index: number | null) => void;
  onDrop: (fromIndex: number, toIndex: number) => void;
  children: (dragProps: {
    dragHandleProps: any;
    isDragging: boolean;
    isHoveredTarget: boolean;
    activeDragIndex: number | null;
    hoverIndex: number | null;
  }) => React.ReactNode;
}

export function DraggableItem({
  index,
  totalCount,
  enabled = true,
  itemHeight = 130,
  listRef,
  scrollOffsetRef,
  activeDragIndex,
  hoverIndex,
  onDragStart,
  onHoverChange,
  onDrop,
  children,
}: DraggableItemProps) {
  const isDragging = activeDragIndex === index;
  const isHoveredTarget = activeDragIndex !== null && hoverIndex === index && !isDragging;

  const translateY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const measuredHeight = useRef<number>(itemHeight);
  const targetIndexRef = useRef<number>(index);

  const latestRef = useRef({
    index,
    totalCount,
    itemHeight,
    listRef,
    scrollOffsetRef,
    onDragStart,
    onHoverChange,
    onDrop,
    translateY,
    scaleAnim,
    enabled,
  });
  latestRef.current = {
    index,
    totalCount,
    itemHeight,
    listRef,
    scrollOffsetRef,
    onDragStart,
    onHoverChange,
    onDrop,
    translateY,
    scaleAnim,
    enabled,
  };

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => latestRef.current.enabled,
      onStartShouldSetPanResponderCapture: () => latestRef.current.enabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return latestRef.current.enabled && Math.abs(gestureState.dy) > 2;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return latestRef.current.enabled && Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        const { listRef: lRef, onDragStart: onStart, onHoverChange: onHover, scaleAnim: sAnim, index: idx } =
          latestRef.current;
        try {
          lRef?.current?.setNativeProps?.({ scrollEnabled: false });
        } catch {}

        try {
          Vibration.vibrate(25);
        } catch {}

        targetIndexRef.current = idx;
        onStart(idx);
        onHover(idx);

        Animated.spring(sAnim, {
          toValue: 1.03,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        const {
          listRef: lRef,
          scrollOffsetRef: sOffsetRef,
          totalCount: count,
          index: idx,
          translateY: tY,
          onHoverChange: onHover,
          itemHeight: hProp,
        } = latestRef.current;

        tY.setValue(gestureState.dy);

        // Auto-scroll near viewport boundaries
        if (lRef?.current && sOffsetRef?.current !== undefined) {
          const windowHeight = Dimensions.get('window').height;
          if (gestureState.moveY < 130) {
            lRef.current.scrollToOffset({
              offset: Math.max(0, sOffsetRef.current - 12),
              animated: false,
            });
          } else if (gestureState.moveY > windowHeight - 130) {
            lRef.current.scrollToOffset({
              offset: sOffsetRef.current + 12,
              animated: false,
            });
          }
        }

        // Calculate dynamic destination index
        const h = measuredHeight.current > 0 ? measuredHeight.current : hProp;
        const slotsMoved = Math.round(gestureState.dy / h);
        const newTarget = Math.max(0, Math.min(count - 1, idx + slotsMoved));

        if (newTarget !== targetIndexRef.current) {
          targetIndexRef.current = newTarget;
          onHover(newTarget);
          try {
            Vibration.vibrate(10);
          } catch {}
        }
      },
      onPanResponderRelease: () => {
        const {
          listRef: lRef,
          index: idx,
          onHoverChange: onHover,
          onDrop: drop,
          itemHeight: hProp,
          translateY: tY,
          scaleAnim: sAnim,
        } = latestRef.current;

        try {
          lRef?.current?.setNativeProps?.({ scrollEnabled: true });
        } catch {}

        const finalTarget = targetIndexRef.current;
        const h = measuredHeight.current > 0 ? measuredHeight.current : hProp;

        if (finalTarget !== idx) {
          const offset = (finalTarget - idx) * h;
          Animated.parallel([
            Animated.timing(tY, {
              toValue: offset,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.timing(sAnim, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
          ]).start(() => {
            tY.setValue(0);
            onHover(null);
            drop(idx, finalTarget);
          });
        } else {
          Animated.parallel([
            Animated.spring(tY, {
              toValue: 0,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.spring(sAnim, {
              toValue: 1,
              friction: 7,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onHover(null);
            drop(idx, idx);
          });
        }
      },
      onPanResponderTerminate: () => {
        const {
          listRef: lRef,
          index: idx,
          onHoverChange: onHover,
          onDrop: drop,
          translateY: tY,
          scaleAnim: sAnim,
        } = latestRef.current;

        try {
          lRef?.current?.setNativeProps?.({ scrollEnabled: true });
        } catch {}

        Animated.parallel([
          Animated.spring(tY, { toValue: 0, useNativeDriver: true }),
          Animated.spring(sAnim, { toValue: 1, useNativeDriver: true }),
        ]).start(() => {
          onHover(null);
          drop(idx, idx);
        });
      },
    });
  }, []);

  const animatedStyle = useMemo(() => {
    if (!isDragging) return null;
    return {
      transform: [{ translateY }, { scale: scaleAnim }],
      zIndex: 9999,
      elevation: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        },
        android: {
          elevation: 20,
        },
        web: {
          boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28)',
          zIndex: 9999,
        } as any,
      }),
    };
  }, [isDragging, translateY, scaleAnim]);

  return (
    <Animated.View
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) measuredHeight.current = h;
      }}
      style={[
        styles.wrapper,
        isDragging && animatedStyle,
        !isDragging && { zIndex: 1 },
      ]}
    >
      {/* Drop Target Indicator Guide */}
      {isHoveredTarget && (
        <View style={styles.dropGuideContainer}>
          <View style={styles.dropGuideLine} />
          <View style={styles.dropGuideBadge}>
            <Ionicons name="arrow-down-circle" size={13} color="#10b981" />
            <Text style={styles.dropGuideText}>
              {`Move to Slot #${index + 1}`}
            </Text>
          </View>
          <View style={styles.dropGuideLine} />
        </View>
      )}

      {children({
        dragHandleProps: panResponder.panHandlers,
        isDragging,
        isHoveredTarget,
        activeDragIndex,
        hoverIndex,
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    position: 'relative',
  },
  dropGuideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
    gap: 8,
  },
  dropGuideLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#10b981',
    borderRadius: 1,
  },
  dropGuideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dropGuideText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
  },
});
