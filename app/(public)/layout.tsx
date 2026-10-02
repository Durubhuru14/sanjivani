import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignInLinks } from "@/components/UserMenu";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-lacquer-deep/95 backdrop-blur supports-[backdrop-filter]:bg-lacquer-deep/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Sanjivani home">
            <Logo />
          </Link>
          <SignInLinks />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {/* The footer carries the strongest oxidation accent (DESIGN.md §6) */}
      <footer className="border-t border-border bg-lacquer-deep">
        <div className="patina-edge" aria-hidden />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
            © {new Date().getFullYear()} Sanjivani · open-source community platform
          </p>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em]">
            built for NGOs, staff, and volunteers
          </p>
        </div>
      </footer>
    </div>
  );
}
