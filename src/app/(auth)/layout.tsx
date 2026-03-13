export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-4xl text-foreground">Arkhos</h1>
          <p className="mt-2 text-sm text-text-tertiary">
            Tu centro de mando personal
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
