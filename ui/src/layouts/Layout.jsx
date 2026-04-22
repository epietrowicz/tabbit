import { Link, Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-svh">
      {/* <header className="border-b border-[var(--border)] px-5 py-4">
        <nav className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <Link
            to="/"
            className="text-lg font-medium tracking-tight text-[var(--text-h)] hover:text-[var(--accent)]"
          >
            Tabbit
          </Link>
          <Link
            to="/"
            className="text-sm text-[var(--text)] underline-offset-4 hover:text-[var(--text-h)] hover:underline"
          >
            Upload
          </Link>
        </nav>
      </header> */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
