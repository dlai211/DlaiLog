import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/ui/page-header';

export default function ProjectsScreen() {
  return (
    <>
      <PageHeader title="Projects" subtitle="Progress of your development work" />
      <ThemedText themeColor="textSecondary">Project progress cards will live here.</ThemedText>
    </>
  );
}
