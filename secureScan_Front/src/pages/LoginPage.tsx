// src/pages/LoginPage.tsx
import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Reserve for cookie/session support later
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Login failed");
      }

      // Later we can update the user context/state
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">
      <div className="w-full max-w-md bg-zinc-950/80 border border-zinc-700 rounded-2xl p-8 shadow-lg">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Log in to SecuraScan
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-zinc-300">Email</label>
            <input
              type="email"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-violet-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm text-zinc-300">Password</label>
            <input
              type="password"
              className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-violet-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 py-2 text-sm font-medium"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-xs text-zinc-400 text-center">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-violet-400 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
