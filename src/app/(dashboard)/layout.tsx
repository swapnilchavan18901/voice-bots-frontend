import { WorkspaceProvider } from "@/components/workspace";
import { Shell } from "@/components/shell";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
