import { ArkhosLogo } from "@/components/ui/arkhos-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <ArkhosLogo size="lg" />
          <p className="text-sm text-text-tertiary">
            Tu centro de mando personal
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
