import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/ui/page-header';

export default function GroceryScreen() {
  return (
    <>
      <PageHeader
        title="Grocery Tracker"
        subtitle="Built automatically from your Spending entries"
      />
      <ThemedText themeColor="textSecondary">
        Price history for every item you buy will live here.
      </ThemedText>
    </>
  );
}
