import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/ui/page-header';

export default function HomeScreen() {
  return (
    <>
      <PageHeader title="Home" />
      <ThemedText themeColor="textSecondary">
        This dashboard will summarise your day — today&apos;s plan, quick notes, spending, projects
        and grocery prices — once the modules are built.
      </ThemedText>
    </>
  );
}
