declare module 'react-native-math-view' {
  import type * as React from 'react';
  import type { StyleProp, TextStyle, ViewProps, ViewStyle } from 'react-native';

  export type ResizeMode = 'cover' | 'contain';

  export interface MathViewProps extends ViewProps {
    /** LaTeX 公式字符串 */
    math: string;
    color?: string;
    resizeMode?: ResizeMode;
    style?: StyleProp<ViewStyle & Pick<TextStyle, 'color'>>;
    onError?: (error: Error) => unknown;
    renderError?: React.ComponentType<{ error: Error }> | React.ReactElement;
  }

  const MathView: React.ComponentType<MathViewProps>;
  export default MathView;
}

declare module 'react-native-math-view/src/fallback' {
  export { default } from 'react-native-math-view';
  export type { MathViewProps, ResizeMode } from 'react-native-math-view';
}
