import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/ui/page-header';

export default function SpendingScreen() {
  return (
    <>
      <PageHeader title="Spending" subtitle="Everything you buy, and where" />
      <ThemedText themeColor="textSecondary">Your purchase log will live here.</ThemedText>
    </>
  );
}
