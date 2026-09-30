import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/ui/page-header';

export default function TodoScreen() {
  return (
    <>
      <PageHeader title="To-do" subtitle="Day and Month views of your tasks" />
      <ThemedText themeColor="textSecondary">
        The Day/Month calendar will live here.
      </ThemedText>
    </>
  );
}
