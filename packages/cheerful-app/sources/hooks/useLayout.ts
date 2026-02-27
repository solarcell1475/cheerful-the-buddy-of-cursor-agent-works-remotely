import { useWindowDimensions } from 'react-native';

export interface LayoutInfo {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  columns: number;
  contentMaxWidth: number;
  chatMaxWidth: number;
  horizontalPadding: number;
  fontSize: {
    title: number;
    subtitle: number;
    body: number;
    caption: number;
    small: number;
  };
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const shortSide = Math.min(width, height);
  const isTablet = shortSide >= 600;

  const columns = isTablet ? (isLandscape ? 3 : 2) : 1;
  const contentMaxWidth = isTablet ? 720 : width;
  const chatMaxWidth = isTablet ? 800 : width;
  const horizontalPadding = isTablet ? 24 : 16;

  const scale = isTablet ? 1.2 : 1;

  return {
    width,
    height,
    isTablet,
    isLandscape,
    columns,
    contentMaxWidth,
    chatMaxWidth,
    horizontalPadding,
    fontSize: {
      title: Math.round(28 * scale),
      subtitle: Math.round(16 * scale),
      body: Math.round(15 * scale),
      caption: Math.round(13 * scale),
      small: Math.round(11 * scale),
    },
  };
}
