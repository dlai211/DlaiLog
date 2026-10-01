import { usePathname, useRouter, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BackupModal } from '@/components/domain/backup-modal';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWindowWidth } from '@/hooks/use-window-width';

/** Windows narrower than this switch to the phone-style bottom bar (PRD §2.1). */
export const WIDE_LAYOUT_MIN_WIDTH = 1000;

export const NAV_ITEMS: { id: string; href: Href; label: string; emoji: string }[] = [
  { id: 'home', href: '/', label: 'Home', emoji: '🏠' },
  { id: 'todo', href: '/todo', label: 'To-do', emoji: '✅' },
  { id: 'projects', href: '/projects', label: 'Projects', emoji: '📊' },
  { id: 'spending', href: '/spending', label: 'Spending', emoji: '💰' },
  { id: 'grocery', href: '/grocery', label: 'Grocery', emoji: '🛒' },
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
 * narrow ones) plus the scrollable content area that every screen renders into.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const width = useWindowWidth();
  const wide = isWideLayout(width);
  const [backupVisible, setBackupVisible] = useState(false);

  return (
    <ThemedView style={[styles.root, wide ? styles.rootRow : styles.rootColumn]}>
      {wide ? <Sidebar onOpenBackup={() => setBackupVisible(true)} /> : null}
      <View style={styles.main}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </View>
      {wide ? null : <BottomBar onOpenBackup={() => setBackupVisible(true)} />}

      {backupVisible ? (
        <BackupModal visible onClose={() => setBackupVisible(false)} />
      ) : null}
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
      type="backgroundElement"
      style={[styles.sidebar, { borderRightColor: theme.border }]}>
      <ThemedText type="heading" style={styles.brand}>
        DlaiLog
      </ThemedText>
      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            id={item.id}
            emoji={item.emoji}
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
      type="backgroundElement"
      style={[styles.bottomBar, { borderTopColor: theme.border }]}>
      {NAV_ITEMS.map((item) => (
        <NavButton
          key={item.id}
          id={item.id}
          emoji={item.emoji}
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
  emoji,
  label,
  active,
  layout,
  onPress,
}: {
  id: string;
  emoji: string;
  label: string;
  active: boolean;
  layout: 'sidebar' | 'bottom';
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      testID={`nav-${id}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        layout === 'sidebar' ? styles.navItemSidebar : styles.navItemBottom,
        active && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText type={layout === 'sidebar' ? 'default' : 'small'}>{emoji}</ThemedText>
      <ThemedText
        type={layout === 'sidebar' ? 'small' : 'caption'}
        themeColor={active ? 'text' : 'textSecondary'}
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
      label={compact ? '💾' : '💾  Backup / Restore'}
      variant="secondary"
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
    gap: Spacing.three,
  },
  sidebar: {
    width: 240,
    padding: Spacing.three,
    gap: Spacing.three,
    borderRightWidth: 1,
  },
  brand: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
  },
  navList: {
    gap: Spacing.one,
  },
  navItemSidebar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  navItemBottom: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
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
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderTopWidth: 1,
  },
  backupCompact: {
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.75,
  },
});
