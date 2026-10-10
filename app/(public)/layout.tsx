import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignInLinks } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Sanjivani home">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <SignInLinks />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-tint/60">
        <div className="seam" aria-hidden />
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p className="text-foreground/70">
            © {new Date().getFullYear()} Sanjivani · open-source community platform
          </p>
          <p className="text-sm text-foreground/70">
            Built for NGOs, staff, and volunteers
          </p>
        </div>
      </footer>
    </div>
  );
}
