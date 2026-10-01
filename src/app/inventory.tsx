import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/ui/page-header';

export default function InventoryScreen() {
  return (
    <>
      <PageHeader title="Inventory" subtitle="What's in stock, and what to buy" />
      <ThemedText themeColor="textSecondary">Inventory is being built.</ThemedText>
    </>
  );
}
