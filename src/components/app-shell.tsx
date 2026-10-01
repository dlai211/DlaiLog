import { usePathname, useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackupModal } from '@/components/domain/backup-modal';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { Radius, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useTheme } from '@/hooks/use-theme';
import { useWindowWidth } from '@/hooks/use-window-width';

/** Windows narrower than this switch to the phone-style bottom bar (PRD §2.1). */
export const WIDE_LAYOUT_MIN_WIDTH = 1000;

export const NAV_ITEMS: { id: string; href: Href; label: string; icon: IconName }[] = [
  { id: 'home', href: '/', label: 'Home', icon: 'home' },
  { id: 'todo', href: '/todo', label: 'To-do', icon: 'todo' },
  { id: 'meals', href: '/meals', label: 'Meals', icon: 'meals' },
  { id: 'inventory', href: '/inventory', label: 'Inventory', icon: 'inventory' },
  { id: 'projects', href: '/projects', label: 'Projects', icon: 'projects' },
  { id: 'spending', href: '/spending', label: 'Spending', icon: 'spending' },
  { id: 'grocery', href: '/grocery', label: 'Grocery', icon: 'grocery' },
];

export function isWideLayout(width: number): boolean {
  return width >= WIDE_LAYOUT_MIN_WIDTH;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The app frame: navigation (left sidebar on wide windows, bottom bar on
 * narrow ones) plus the scrollable content area every screen renders into.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const width = useWindowWidth();
  const wide = isWideLayout(width);
  const pathname = usePathname();
  const [backupVisible, setBackupVisible] = useState(false);

  return (
    <ThemedView style={[styles.root, wide ? styles.rootRow : styles.rootColumn]}>
      {wide ? <Sidebar onOpenBackup={() => setBackupVisible(true)} /> : null}
      <View style={styles.main}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {/* Keyed by route, so every navigation fades in the same way. */}
          <ScreenTransition key={pathname}>
            <View style={styles.content}>{children}</View>
          </ScreenTransition>
        </ScrollView>
      </View>
      {wide ? null : <BottomBar onOpenBackup={() => setBackupVisible(true)} />}

      {backupVisible ? <BackupModal visible onClose={() => setBackupVisible(false)} /> : null}
    </ThemedView>
  );
}

function Sidebar({ onOpenBackup }: { onOpenBackup: () => void }) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <ThemedView
      testID="app-shell-sidebar"
      type="surfaceMuted"
      style={[styles.sidebar, { borderRightColor: theme.border }]}>
      <View style={styles.brandRow}>
        <View style={[styles.brandMark, { borderColor: theme.borderStrong }]}>
          <Icon name="leaf" size={16} color={theme.primary} />
        </View>
        <ThemedText type="heading">DlaiLog</ThemedText>
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            id={item.id}
            icon={item.icon}
            label={item.label}
            layout="sidebar"
            active={isNavItemActive(pathname, item.href as string)}
            onPress={() => router.push(item.href)}
          />
        ))}
      </View>

      <View style={styles.spacer} />
      <BackupButton compact={false} onPress={onOpenBackup} />
      <ThemedText type="caption" themeColor="textTertiary">
        Saved on this PC
      </ThemedText>
    </ThemedView>
  );
}

function BottomBar({ onOpenBackup }: { onOpenBackup: () => void }) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <ThemedView
      testID="app-shell-bottom-bar"
      type="surfaceMuted"
      style={[styles.bottomBar, { borderTopColor: theme.border }]}>
      {NAV_ITEMS.map((item) => (
        <NavButton
          key={item.id}
          id={item.id}
          icon={item.icon}
          label={item.label}
          layout="bottom"
          active={isNavItemActive(pathname, item.href as string)}
          onPress={() => router.push(item.href)}
        />
      ))}
      <BackupButton compact onPress={onOpenBackup} />
    </ThemedView>
  );
}

function NavButton({
  id,
  icon,
  label,
  active,
  layout,
  onPress,
}: {
  id: string;
  icon: IconName;
  label: string;
  active: boolean;
  layout: 'sidebar' | 'bottom';
  onPress: () => void;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      testID={`nav-${id}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        layout === 'sidebar' ? styles.navItemSidebar : styles.navItemBottom,
        active && { backgroundColor: theme.backgroundSelected },
        hovered && !active && { backgroundColor: theme.hover },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={layout === 'sidebar' ? 18 : 20} color={active ? theme.text : theme.textSecondary} />
      <ThemedText
        type={layout === 'sidebar' ? 'small' : 'caption'}
        themeColor={active ? 'text' : 'textSecondary'}
        numberOfLines={1}
        style={active ? styles.navLabelActive : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function BackupButton({ compact, onPress }: { compact: boolean; onPress: () => void }) {
  return (
    <Button
      testID="backup-button"
      icon="download"
      label={compact ? '' : 'Backup / Restore'}
      variant="ghost"
      onPress={onPress}
      style={compact ? styles.backupCompact : undefined}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootRow: {
    flexDirection: 'row',
  },
  rootColumn: {
    flexDirection: 'column',
  },
  main: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    padding: Spacing.four,
    flexGrow: 1,
  },
  content: {
    width: '100%',
    maxWidth: 1100,
  },
  sidebar: {
    width: 236,
    padding: Spacing.three,
    gap: Spacing.three,
    borderRightWidth: 1,
    borderStyle: 'dashed',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navList: {
    gap: Spacing.half,
  },
  navItemSidebar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: Radius.medium,
  },
  navItemBottom: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.small,
  },
  navLabelActive: {
    fontWeight: 700,
  },
  spacer: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  backupCompact: {
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
  },
});
