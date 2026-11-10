import Link from "next/link";

const NAV_ITEMS = [
  { href: "/partidos", label: "Partidos" },
  { href: "/partidos/nuevo", label: "Subir partido" },
];

export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 py-2">
        <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight">
          Humbol <span className="text-primary">Stats</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-3"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
