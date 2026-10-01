import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/ui/page-header';

export default function MealsScreen() {
  return (
    <>
      <PageHeader title="Meals" subtitle="Your dishes, and what they need" />
      <ThemedText themeColor="textSecondary">Meals are being built.</ThemedText>
    </>
  );
}
