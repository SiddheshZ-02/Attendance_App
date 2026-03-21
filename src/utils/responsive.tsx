// ================================================================
//  ENTERPRISE RESPONSIVE SYSTEM v2.2  (Bug-Fixed)
//  Single-file · TypeScript · Production-Ready · Single Theme
//
//  ✅ Fixed Bugs:
//    #1 — insets object in useMemo deps → busted memo every render
//    #2 — ref.current as useMemo dep → React never tracks it
//    #3 — useStableRef was a broken pattern → removed entirely
//    #4 — isBoldTextEnabled not guarded → crashed on older RN
//    #5 — unused `useRef` import after #3 fix → TS warning
//
//  Exports:
//    Providers  → <AppSystemProvider>
//    Hooks      → useResponsive, useAppTheme, useA11y, useAdaptiveValue
//    Static     → scale, staticWp, staticHp, staticFp, staticMs
//    Helpers    → createThemedStyles
//    Types      → Theme, ResponsiveReturn, ColorPalette, etc.
// ================================================================

import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
  ReactNode,
  // ✅ FIX #5 — removed `useRef` import (was only used by deleted useStableRef)
} from 'react';
import {
  useWindowDimensions,
  PixelRatio,
  Platform,
  Dimensions,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ================================================================
// 🎯 DESIGN BASELINE  (match your Figma frame)
// ================================================================
const BASE_WIDTH  = 393;  // iPhone 14 Pro logical width
const BASE_HEIGHT = 852;  // iPhone 14 Pro logical height
const MAX_SCALE   = 1.25; // guard against over-inflation on iPads
const MIN_SCALE   = 0.75; // guard against too-small on tiny phones

// ================================================================
// 🗂️  TYPES
// ================================================================

export interface ColorPalette {
  background:      string;
  surface:         string;
  surfaceElevated: string;
  border:          string;
  text:            string;
  textSecondary:   string;
  textDisabled:    string;
  primary:         string;
  primaryLight:    string;
  primaryDark:     string;
  success:         string;
  warning:         string;
  error:           string;
  info:            string;
  overlay:         string;
}

export interface TypographyScale {
  xs:   number;
  sm:   number;
  md:   number;
  lg:   number;
  xl:   number;
  xxl:  number;
  hero: number;
}

export interface SpacingScale {
  xxs: number;
  xs:  number;
  sm:  number;
  md:  number;
  lg:  number;
  xl:  number;
  xxl: number;
}

export interface RadiusScale {
  xs:   number;
  sm:   number;
  md:   number;
  lg:   number;
  xl:   number;
  full: number;
}

export interface ShadowToken {
  shadowColor:   string;
  shadowOffset:  { width: number; height: number };
  shadowOpacity: number;
  shadowRadius:  number;
  elevation:     number; // Android
}

export interface Theme {
  colors:  ColorPalette;
  shadows: {
    sm: ShadowToken;
    md: ShadowToken;
    lg: ShadowToken;
  };
}

export interface ScaleFunctions {
  /** Scale a Figma width value to current screen width */
  wp: (size: number) => number;
  /** Scale a Figma height value to current screen height */
  hp: (size: number) => number;
  /**
   * Moderate scale — blends proportional and fixed.
   * factor=0 → no scaling, factor=1 → full proportional
   */
  ms: (size: number, factor?: number) => number;
  /**
   * Font scale — proportional but also respects user
   * accessibility font-size preferences
   */
  fp: (size: number) => number;
}

export interface DeviceInfo {
  isTablet:     boolean;
  isSmallPhone: boolean;
  isLandscape:  boolean;
  IS_IOS:       boolean;
  IS_ANDROID:   boolean;
}

export interface ScreenInfo {
  width:  number;
  height: number;
}

export interface LayoutTokens {
  spacing:           SpacingScale;
  fontSizes:         TypographyScale;
  radius:            RadiusScale;
  /** max-width for centered container layout (tablet only) */
  containerMaxWidth: number | undefined;
}

export interface ResponsiveReturn
  extends ScaleFunctions,
    DeviceInfo,
    LayoutTokens {
  SCREEN:      ScreenInfo;
  insets:      ReturnType<typeof useSafeAreaInsets>;
  /** 'row' on tablet, 'column' on phone */
  rowOnTablet: 'row' | 'column';
}

// ================================================================
// 🎨  SINGLE THEME  (edit colors here — one source of truth)
// ================================================================
const APP_THEME: Theme = {
  colors: {
    background:      '#FFFFFF',
    surface:         '#F7F8FA',
    surfaceElevated: '#FFFFFF',
    border:          '#E4E6EB',
    text:            '#0D0F12',
    textSecondary:   '#5A6272',
    textDisabled:    '#ABAFC7',
    primary:         '#4361EE',
    primaryLight:    '#6E87F4',
    primaryDark:     '#2B45D4',
    success:         '#22C55E',
    warning:         '#F59E0B',
    error:           '#EF4444',
    info:            '#3B82F6',
    overlay:         'rgba(0,0,0,0.45)',
  },
  shadows: {
    sm: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius:  3,
      elevation:     2,
    },
    md: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.09,
      shadowRadius:  8,
      elevation:     5,
    },
    lg: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius:  20,
      elevation:     10,
    },
  },
};

// ================================================================
// 🗄️  STATIC SCALING  (for use outside React components)
//     Uses Dimensions snapshot — not reactive to rotation.
//     Safe for StyleSheet.create(), animation configs, constants.
// ================================================================
const _dim       = Dimensions.get('window');
const _wRatio    = _dim.width  / BASE_WIDTH;
const _hRatio    = _dim.height / BASE_HEIGHT;
const _baseScale = Math.min(
  Math.max(Math.min(_wRatio, _hRatio), MIN_SCALE),
  MAX_SCALE,
);

export const staticWp = (size: number): number =>
  PixelRatio.roundToNearestPixel(size * _wRatio);

export const staticHp = (size: number): number =>
  PixelRatio.roundToNearestPixel(size * _hRatio);

export const staticMs = (size: number, factor = 0.5): number =>
  PixelRatio.roundToNearestPixel(
    size + (_baseScale * size - size) * factor,
  );

export const staticFp = (size: number): number => {
  const scaled = size * _baseScale;
  return Math.round(
    PixelRatio.roundToNearestPixel(scaled) / PixelRatio.getFontScale(),
  );
};

/** Convenience namespace for static scale utilities */
export const scale = {
  wp: staticWp,
  hp: staticHp,
  ms: staticMs,
  fp: staticFp,
};

// ================================================================
// ♿  ACCESSIBILITY CONTEXT
// ================================================================
interface A11yContextValue {
  reduceMotion:    boolean;
  boldText:        boolean;
  fontScaleFactor: number;
}

const A11yContext = createContext<A11yContextValue>({
  reduceMotion:    false,
  boldText:        false,
  fontScaleFactor: 1,
});

// ================================================================
// 📐  RESPONSIVE CONTEXT
// ================================================================
const ResponsiveContext = createContext<ResponsiveReturn | null>(null);

// ================================================================
// 🏗️  PROVIDERS
// ================================================================

// ------ Accessibility Provider ------
const A11yProvider = ({ children }: { children: ReactNode }) => {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [boldText,     setBoldText]     = useState(false);

  useEffect(() => {
    // Reduce motion — supported on both iOS and Android
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub1 = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    // ✅ FIX #4 — guard isBoldTextEnabled before calling it.
    // It exists since RN 0.64 iOS-only. Calling without the guard
    // on Android or older RN threw: "isBoldTextEnabled is not a function"
    if (Platform.OS === 'ios' && typeof AccessibilityInfo.isBoldTextEnabled === 'function') {
      AccessibilityInfo.isBoldTextEnabled().then(setBoldText);
      const sub2 = AccessibilityInfo.addEventListener(
        'boldTextChanged',
        setBoldText,
      );
      return () => { sub1.remove(); sub2.remove(); };
    }

    return () => sub1.remove();
  }, []);

  const value = useMemo<A11yContextValue>(
    () => ({
      reduceMotion,
      boldText,
      fontScaleFactor: PixelRatio.getFontScale(),
    }),
    [reduceMotion, boldText],
  );

  return (
    <A11yContext.Provider value={value}>{children}</A11yContext.Provider>
  );
};

// ------ Responsive Provider ------
const ResponsiveProvider = ({ children }: { children: ReactNode }) => {
  const { width, height } = useWindowDimensions();
  const insets            = useSafeAreaInsets();

  // ✅ FIX #1 — useSafeAreaInsets() returns a NEW object reference on
  // every parent render. Putting `insets` directly in the deps array
  // caused useMemo to bust on EVERY render, making memoization useless.
  // Fix: destructure to primitive numbers — React compares these by value.
  const { top, bottom, left, right } = insets;

  const value = useMemo<ResponsiveReturn>(() => {
    // ── Ratios ──────────────────────────────────────────────────
    const wRatio    = width  / BASE_WIDTH;
    const hRatio    = height / BASE_HEIGHT;
    const baseScale = Math.min(
      Math.max(Math.min(wRatio, hRatio), MIN_SCALE),
      MAX_SCALE,
    );

    // ── Scale functions ──────────────────────────────────────────
    const wp: ScaleFunctions['wp'] = size =>
      PixelRatio.roundToNearestPixel(size * wRatio);

    const hp: ScaleFunctions['hp'] = size =>
      PixelRatio.roundToNearestPixel(size * hRatio);

    const ms: ScaleFunctions['ms'] = (size, factor = 0.5) =>
      PixelRatio.roundToNearestPixel(
        size + (baseScale * size - size) * factor,
      );

    const fp: ScaleFunctions['fp'] = size => {
      const scaled = size * baseScale;
      return Math.round(
        PixelRatio.roundToNearestPixel(scaled) / PixelRatio.getFontScale(),
      );
    };

    // ── Device detection ────────────────────────────────────────
    // Both axes must qualify — prevents landscape phone → tablet mismatch
    const isTablet     = width >= 768 && height >= 600;
    const isSmallPhone = width < 375;
    const isLandscape  = width > height;

    // ── Layout tokens ────────────────────────────────────────────
    const spacing: SpacingScale = {
      xxs: wp(2),
      xs:  wp(4),
      sm:  wp(8),
      md:  wp(16),
      lg:  wp(24),
      xl:  wp(32),
      xxl: wp(48),
    };

    const fontSizes: TypographyScale = {
      xs:   fp(11),
      sm:   fp(13),
      md:   fp(15),
      lg:   fp(18),
      xl:   fp(22),
      xxl:  fp(28),
      hero: fp(36),
    };

    const radius: RadiusScale = {
      xs:   wp(4),
      sm:   wp(8),
      md:   wp(12),
      lg:   wp(16),
      xl:   wp(24),
      full: 9999,
    };

    // Reconstruct insets from stable primitives so the return object
    // stays consistent with the ReturnType<typeof useSafeAreaInsets> shape
    const stableInsets = { top, bottom, left, right };

    return {
      wp, hp, ms, fp,
      spacing,
      fontSizes,
      radius,
      isTablet,
      isSmallPhone,
      isLandscape,
      containerMaxWidth: isTablet ? 680 : undefined,
      rowOnTablet:       isTablet ? 'row' : 'column',
      insets:            stableInsets,
      SCREEN: { width, height },
      IS_IOS:     Platform.OS === 'ios',
      IS_ANDROID: Platform.OS === 'android',
    };
    // ✅ FIX #1 continued — deps are now stable primitives, not an object
  }, [width, height, top, bottom, left, right]);

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
};

// ================================================================
// 🏠  APP SYSTEM PROVIDER  (single wrapper for your entire app)
//
//  Usage in App.tsx:
//    <SafeAreaProvider>
//      <AppSystemProvider>
//        <YourApp />
//      </AppSystemProvider>
//    </SafeAreaProvider>
// ================================================================
export const AppSystemProvider = ({ children }: { children: ReactNode }) => (
  <A11yProvider>
    <ResponsiveProvider>
      {children}
    </ResponsiveProvider>
  </A11yProvider>
);

// ================================================================
// 🪝  HOOKS
// ================================================================

/**
 * useResponsive
 * Returns live scaling functions and layout tokens.
 * Re-renders only when screen dimensions or safe area insets change.
 */
export const useResponsive = (): ResponsiveReturn => {
  const ctx = useContext(ResponsiveContext);
  if (!ctx) {
    throw new Error('useResponsive must be used inside <AppSystemProvider>');
  }
  return ctx;
};

/**
 * useAppTheme
 * Returns the app's fixed color palette and shadow tokens.
 *
 * const { colors, shadows } = useAppTheme();
 * colors.primary  → '#4361EE'
 * shadows.md      → full shadow object (works on iOS + Android)
 */
export const useAppTheme = (): Theme => APP_THEME;

/**
 * useA11y
 * Returns accessibility flags for animations and typography.
 *
 * const { reduceMotion } = useA11y();
 * if (reduceMotion) → skip animations
 */
export const useA11y = (): A11yContextValue => useContext(A11yContext);

/**
 * useAdaptiveValue
 * Returns a different value for phone vs tablet.
 *
 * const cols = useAdaptiveValue(1, 3); // 1 on phone, 3 on tablet
 */
export function useAdaptiveValue<T>(phoneValue: T, tabletValue: T): T {
  const { isTablet } = useResponsive();
  return isTablet ? tabletValue : phoneValue;
};

// ================================================================
// 🛠️  STYLE FACTORY
// ================================================================

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (
  colors:  ColorPalette,
  responsive: ResponsiveReturn,
) => T;

/**
 * createThemedStyles
 * Like StyleSheet.create() but receives color and responsive tokens.
 * Memoizes the stylesheet — no re-creation unless screen size changes.
 *
 * Usage:
 *   const useStyles = createThemedStyles((colors, { radius, spacing, wp }) => ({
 *     card: { 
 *       backgroundColor: colors.surface, 
 *       borderRadius: radius.md,
 *       width: wp(300)
 *     },
 *   }));
 *
 *   // Inside component:
 *   const styles = useStyles();
 */
export function createThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: StyleFactory<T>,
): () => T {
  return function useStyles(): T {
    const { colors } = useAppTheme();
    const responsive = useResponsive();

    return useMemo(
      () => StyleSheet.create(factory(colors, responsive)),
      [colors, responsive],
    );
  };
}

// ================================================================
// 📦  USAGE EXAMPLES
// ================================================================
/*

─────────────────────────────────────────────────────────
1.  APP ENTRY  (App.tsx)
─────────────────────────────────────────────────────────

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppSystemProvider } from './ResponsiveSystem';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppSystemProvider>
        <RootNavigator />
      </AppSystemProvider>
    </SafeAreaProvider>
  );
}

─────────────────────────────────────────────────────────
2.  SCREEN COMPONENT (inline styles)
─────────────────────────────────────────────────────────

import { useResponsive, useAppTheme } from './ResponsiveSystem';

const HomeScreen = () => {
  const { spacing, fontSizes, radius, insets } = useResponsive();
  const { colors, shadows } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          margin: spacing.md,
          padding: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          ...shadows.md,
        }}
      >
        <Text style={{ fontSize: fontSizes.lg, color: colors.text }}>
          Hello World
        </Text>
      </View>
    </View>
  );
};

─────────────────────────────────────────────────────────
3.  STYLED COMPONENT  (createThemedStyles)
─────────────────────────────────────────────────────────

const useStyles = createThemedStyles((colors, radius, spacing) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
  },
}));

const MyCard = () => {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Card</Text>
      </View>
    </View>
  );
};

─────────────────────────────────────────────────────────
4.  STATIC SCALE  (animation configs, StyleSheet outside components)
─────────────────────────────────────────────────────────

import { scale } from './ResponsiveSystem';

const CARD_HEIGHT   = scale.hp(120);  // Figma height → device pixels
const ICON_SIZE     = scale.wp(24);   // Figma width  → device pixels
const HEADING_SIZE  = scale.fp(22);   // font with a11y respect
const BUTTON_RADIUS = scale.ms(12);   // moderate scale

─────────────────────────────────────────────────────────
5.  ADAPTIVE LAYOUT  (phone vs tablet)
─────────────────────────────────────────────────────────

const cols = useAdaptiveValue(1, 3);
const { rowOnTablet, containerMaxWidth } = useResponsive();

<View style={{ flexDirection: rowOnTablet, maxWidth: containerMaxWidth }}>
  ...
</View>

─────────────────────────────────────────────────────────
6.  ACCESSIBILITY-AWARE ANIMATION
─────────────────────────────────────────────────────────

const { reduceMotion } = useA11y();

useEffect(() => {
  if (reduceMotion) return;  // skip animation for sensitive users
  Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
}, []);

*/