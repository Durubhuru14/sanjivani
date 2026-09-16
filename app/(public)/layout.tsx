import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignInLinks } from "@/components/UserMenu";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Sanjivani home">
            <Logo />
          </Link>
          <SignInLinks />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Sanjivani · Open-source community platform</p>
          <p className="flex items-center gap-1.5">
            Built for NGOs, staff, and volunteers
          </p>
        </div>
      </footer>
    </div>
  );
}
