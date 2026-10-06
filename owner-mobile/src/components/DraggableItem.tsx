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

  const translateY = useMemo(() => new Animated.Value(0), []);
  const scaleAnim = useMemo(() => new Animated.Value(1), []);
  const measuredHeight = useRef<number>(itemHeight);
  const targetIndexRef = useRef<number>(index);

  const panResponder = useMemo(() => {
    if (!enabled) {
      return { panHandlers: {} };
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 2;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        // Lock parent scrolling to avoid gesture collisions
        try {
          listRef?.current?.setNativeProps?.({ scrollEnabled: false });
        } catch {}

        // Haptic feedback bump
        try {
          Vibration.vibrate(25);
        } catch {}

        targetIndexRef.current = index;
        onDragStart(index);
        onHoverChange(index);

        Animated.spring(scaleAnim, {
          toValue: 1.03,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(gestureState.dy);

        // Auto-scroll near viewport boundaries
        if (listRef?.current && scrollOffsetRef?.current !== undefined) {
          const windowHeight = Dimensions.get('window').height;
          if (gestureState.moveY < 130) {
            listRef.current.scrollToOffset({
              offset: Math.max(0, scrollOffsetRef.current - 12),
              animated: false,
            });
          } else if (gestureState.moveY > windowHeight - 130) {
            listRef.current.scrollToOffset({
              offset: scrollOffsetRef.current + 12,
              animated: false,
            });
          }
        }

        // Calculate dynamic destination index
        const h = measuredHeight.current > 0 ? measuredHeight.current : itemHeight;
        const slotsMoved = Math.round(gestureState.dy / h);
        const newTarget = Math.max(0, Math.min(totalCount - 1, index + slotsMoved));

        if (newTarget !== targetIndexRef.current) {
          targetIndexRef.current = newTarget;
          onHoverChange(newTarget);
          try {
            Vibration.vibrate(10);
          } catch {}
        }
      },
      onPanResponderRelease: () => {
        try {
          listRef?.current?.setNativeProps?.({ scrollEnabled: true });
        } catch {}

        const finalTarget = targetIndexRef.current;
        const h = measuredHeight.current > 0 ? measuredHeight.current : itemHeight;

        if (finalTarget !== index) {
          const offset = (finalTarget - index) * h;
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: offset,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
          ]).start(() => {
            translateY.setValue(0);
            onHoverChange(null);
            onDrop(index, finalTarget);
          });
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 7,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onHoverChange(null);
            onDrop(index, index);
          });
        }
      },
      onPanResponderTerminate: () => {
        try {
          listRef?.current?.setNativeProps?.({ scrollEnabled: true });
        } catch {}

        Animated.parallel([
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        ]).start(() => {
          onHoverChange(null);
          onDrop(index, index);
        });
      },
    });
  }, [
    enabled,
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
  ]);

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
