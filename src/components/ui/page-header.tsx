import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, soft } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The standard top of every screen: page title on the left,
 * the screen's main "+ Add" action on the right (PRD §2.2).
 *
 * Each screen has an accent colour, and the bar beside the title is where it
 * shows — so it is clear at a glance which section you are in. The dashed rule
 * underneath ends the header the same way on every screen.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  accent,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** The screen's accent colour (see `Accents`). */
  accent?: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.titleBlock}>
          <View style={[styles.titleRow, accent ? { backgroundColor: soft(accent, '1f') } : null]}>
            {accent ? <View style={[styles.accentBar, { backgroundColor: accent }]} /> : null}
            <ThemedText type="heading">{title}</ThemedText>
          </View>
          {subtitle ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>

      <View style={[styles.rule, { borderColor: theme.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.three,
    // Space above and below the title bar, so it never crowds the edge.
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  titleBlock: {
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingRight: Spacing.three,
    paddingLeft: Spacing.one,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  accentBar: {
    width: 9,
    height: 9,
    borderRadius: Radius.pill,
  },
  action: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rule: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
});
