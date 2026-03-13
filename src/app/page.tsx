export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-cream)]">
      <h1
        className="text-5xl tracking-tight text-[var(--text-primary)]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Arkhos
      </h1>
      <p
        className="mt-3 text-lg text-[var(--text-tertiary)]"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Plataforma personal de gestión modular
      </p>
    </main>
  );
}
