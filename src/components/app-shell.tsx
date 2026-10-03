import { usePathname, useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackupModal } from '@/components/domain/backup-modal';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { ScreenTransition } from '@/components/ui/screen-transition';
import { ThemeSwitch } from '@/components/ui/theme-switch';
import { MaxContentWidth, Radius, SidebarRailWidth, SidebarWidth, Spacing } from '@/constants/theme';
import { useHover } from '@/hooks/use-hover';
import { useSidebarCollapsed } from '@/hooks/use-sidebar-collapsed';
import { useTheme } from '@/hooks/use-theme';
import { useWindowWidth } from '@/hooks/use-window-width';

/** Windows narrower than this switch to the phone-style bottom bar (PRD §2.1). */
export const WIDE_LAYOUT_MIN_WIDTH = 1000;

/** In the order the sidebar lists them, top to bottom (the bottom bar reuses it). */
export const NAV_ITEMS: { id: string; href: Href; label: string; icon: IconName }[] = [
  { id: 'home', href: '/', label: 'Home', icon: 'home' },
  { id: 'todo', href: '/todo', label: 'To-do', icon: 'todo' },
  { id: 'projects', href: '/projects', label: 'Projects', icon: 'projects' },
  { id: 'meals', href: '/meals', label: 'Meals', icon: 'meals' },
  { id: 'inventory', href: '/inventory', label: 'Inventory', icon: 'inventory' },
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

/**
 * The left sidebar. The button at its top-right compacts it to a rail of
 * icons (the logo stays); hovering the rail opens it again for as long as the
 * pointer is on it, so the labels are always one hover away, and clicking the
 * button pins it back open.
 */
function Sidebar({ onOpenBackup }: { onOpenBackup: () => void }) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useSidebarCollapsed();
  const { hovered, hoverProps } = useHover();

  const expanded = !collapsed || hovered;

  return (
    <ThemedView
      testID="app-shell-sidebar"
      type="surfaceMuted"
      {...hoverProps}
      style={[
        styles.sidebar,
        expanded ? styles.sidebarExpanded : styles.sidebarRail,
        { borderRightColor: theme.border },
      ]}>
      <View style={[styles.brandRow, !expanded && styles.brandRowRail]}>
        <View style={[styles.brandMark, { borderColor: theme.borderStrong }]}>
          <Icon name="leaf" size={16} color={theme.primary} />
        </View>
        {expanded ? <ThemedText type="heading">DlaiLog</ThemedText> : null}
        <View style={styles.brandSpacer} />
        <Pressable
          testID="sidebar-toggle"
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expand the sidebar' : 'Compact the sidebar'}
          accessibilityState={{ expanded }}
          onPress={toggle}
          style={({ pressed }) => [
            styles.toggleButton,
            { borderColor: theme.border },
            hovered && { backgroundColor: theme.hover },
            pressed && styles.pressed,
          ]}>
          <Icon name="panel" size={15} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            id={item.id}
            icon={item.icon}
            label={item.label}
            layout="sidebar"
            showLabel={expanded}
            active={isNavItemActive(pathname, item.href as string)}
            onPress={() => router.push(item.href)}
          />
        ))}
      </View>

      <View style={styles.spacer} />

      {expanded ? (
        <>
          <View style={styles.appearance}>
            <ThemedText type="caption" themeColor="textTertiary">
              Appearance
            </ThemedText>
            <ThemeSwitch />
          </View>

          <BackupButton compact={false} onPress={onOpenBackup} />
          <ThemedText type="caption" themeColor="textTertiary">
            Saved on this PC
          </ThemedText>
        </>
      ) : (
        <BackupButton compact onPress={onOpenBackup} />
      )}
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
  showLabel = true,
  onPress,
}: {
  id: string;
  icon: IconName;
  label: string;
  active: boolean;
  layout: 'sidebar' | 'bottom';
  /** False on the compacted rail, where only the icon shows. */
  showLabel?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      testID={`nav-${id}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...hoverProps}
      style={({ pressed }) => [
        layout === 'sidebar' ? styles.navItemSidebar : styles.navItemBottom,
        !showLabel && styles.navItemRail,
        active && { backgroundColor: theme.backgroundSelected },
        hovered && !active && { backgroundColor: theme.hover },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={layout === 'sidebar' ? 18 : 20} color={active ? theme.text : theme.textSecondary} />
      {showLabel ? (
        <ThemedText
          type={layout === 'sidebar' ? 'small' : 'caption'}
          themeColor={active ? 'text' : 'textSecondary'}
          numberOfLines={1}
          style={active ? styles.navLabelActive : undefined}>
          {label}
        </ThemedText>
      ) : null}
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
    // Generous breathing room around the whole page, top and bottom included.
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
    flexGrow: 1,
  },
  content: {
    // The column fills the window, stops growing at MaxContentWidth and stays
    // centred on very wide displays — so nothing clusters to one side.
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  sidebar: {
    padding: Spacing.three,
    gap: Spacing.three,
    borderRightWidth: 1,
    borderStyle: 'dashed',
    // RNW reads these straight off the style object; they are what make the
    // rail open smoothly rather than jump.
    ...Platform.select({
      web: {
        transitionProperty: 'width',
        transitionDuration: '160ms',
        transitionTimingFunction: 'ease',
      },
      default: {},
    }),
  },
  sidebarExpanded: {
    width: SidebarWidth,
  },
  sidebarRail: {
    width: SidebarRailWidth,
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
  },
  brandRowRail: {
    flexDirection: 'column',
    gap: Spacing.one,
    paddingHorizontal: 0,
  },
  brandSpacer: {
    flex: 1,
  },
  toggleButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.small,
    padding: Spacing.one,
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
    gap: Spacing.twoHalf,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radius.medium,
  },
  navItemRail: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  navItemBottom: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.oneHalf,
    borderRadius: Radius.small,
  },
  navLabelActive: {
    fontWeight: 700,
  },
  spacer: {
    flex: 1,
  },
  appearance: {
    gap: Spacing.oneHalf,
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
