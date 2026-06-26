export type ReaderThemeKey = 'light' | 'dark' | 'sepia';

export interface ReaderTheme {
  key: ReaderThemeKey;
  label: string;
  /** 页面整体背景 */
  background: string;
  /** 顶部/底部栏背景 */
  barBackground: string;
  /** 正文背景（传给原生视图） */
  contentBackground: string;
  /** 正文文字颜色（传给原生视图） */
  textColor: string;
  /** 次要文字（页码、计数等） */
  secondaryText: string;
  /** 主题色/可点击文字 */
  accent: string;
  /** 分隔线 */
  border: string;
  /** 选词栏背景 */
  selectionBarBackground: string;
}

export const READER_THEMES: Record<ReaderThemeKey, ReaderTheme> = {
  light: {
    key: 'light',
    label: '明亮',
    background: '#FFFFFF',
    barBackground: '#FFFFFF',
    contentBackground: '#FFFFFF',
    textColor: '#1A1A1A',
    secondaryText: '#8E8E93',
    accent: '#007AFF',
    border: '#E5E5EA',
    selectionBarBackground: '#F7F7FA',
  },
  dark: {
    key: 'dark',
    label: '黑暗',
    background: '#121212',
    barBackground: '#1C1C1E',
    contentBackground: '#121212',
    textColor: '#E8E8EA',
    secondaryText: '#9A9AA0',
    accent: '#0A84FF',
    border: '#2C2C2E',
    selectionBarBackground: '#1C1C1E',
  },
  sepia: {
    key: 'sepia',
    label: '护眼',
    background: '#F5ECD9',
    barBackground: '#EFE3C9',
    contentBackground: '#F5ECD9',
    textColor: '#4B3F2F',
    secondaryText: '#8C7A5B',
    accent: '#A6712E',
    border: '#E0D2B4',
    selectionBarBackground: '#EFE3C9',
  },
};

export const READER_THEME_ORDER: ReaderThemeKey[] = ['light', 'dark', 'sepia'];
export const DEFAULT_READER_THEME: ReaderThemeKey = 'light';
