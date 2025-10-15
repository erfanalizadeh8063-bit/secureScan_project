import { Outlet, Link, NavLink } from "react-router-dom";

export default function Shell() {
  return (
    <div className="min-h-screen bg-surface-0 text-neutral-100">
      <header className="border-b border-neutral-800 bg-surface-1/60 backdrop-blur-safe">
        <div className="container flex items-center gap-6 py-3">
          <Link to="/" className="font-semibold tracking-wide">
            SecuraScan
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            {[
              { to: "/", label: "Home", end: true },
              { to: "/dashboard", label: "Dashboard" },
              { to: "/history", label: "History" },
              { to: "/results", label: "Results" },
            ].map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end as any}
                className={({ isActive }) =>
                  [
                    "px-1.5 py-1 text-neutral-400 hover:text-neutral-200 transition",
                    isActive ? "text-neutral-100 border-b-2 border-neutral-200" : "",
                  ].join(" ")
                }
                title={i.label} // a11y tooltip
              >
                {i.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto text-xs text-neutral-500">MVP</div>
        </div>
      </header>

      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  );
}
