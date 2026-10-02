import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fluid } from '@/lib/fluid';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'heading'
    | 'subtitle'
    | 'small'
    | 'smallBold'
    | 'label'
    | 'caption'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'heading' && styles.heading,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'label' && styles.label,
        type === 'caption' && styles.caption,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

// Type sizes follow the window like everything else (see lib/fluid): the
// numbers are the design sizes at a 1440px-wide window, with floors that keep
// small text readable and ceilings that stop big headings running away.
const styles = StyleSheet.create({
  small: {
    fontSize: fluid(14),
    lineHeight: fluid(20),
    fontWeight: 500,
  },
  smallBold: {
    fontSize: fluid(14),
    lineHeight: fluid(20),
    fontWeight: 700,
  },
  heading: {
    fontSize: fluid(22),
    lineHeight: fluid(30),
    fontWeight: 700,
  },
  label: {
    fontSize: fluid(13),
    lineHeight: fluid(18),
    fontWeight: 600,
  },
  caption: {
    fontSize: fluid(12, { min: 11 }),
    lineHeight: fluid(16, { min: 14 }),
    fontWeight: 500,
  },
  default: {
    fontSize: fluid(16),
    lineHeight: fluid(24),
    fontWeight: 500,
  },
  title: {
    fontSize: fluid(48, { min: 32, max: 54 }),
    fontWeight: 600,
    lineHeight: fluid(52, { min: 36, max: 58 }),
  },
  subtitle: {
    fontSize: fluid(32, { min: 24, max: 38 }),
    lineHeight: fluid(44, { min: 32, max: 50 }),
    fontWeight: 600,
  },
  link: {
    lineHeight: fluid(30),
    fontSize: fluid(14),
  },
  linkPrimary: {
    lineHeight: fluid(30),
    fontSize: fluid(14),
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: fluid(12, { min: 11 }),
  },
});
