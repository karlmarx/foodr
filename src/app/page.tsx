import ChainGrid from "@/components/ChainGrid";
import GlobalStats from "@/components/GlobalStats";
import Leaderboard from "@/components/Leaderboard";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-10">
      <header className="text-center mb-10 fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-[11px] uppercase tracking-wider text-[var(--muted)] mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--good)] animate-pulse" />
          Live ratings · persisted · proof-of-work protected
        </div>
        <h1 className="text-7xl md:text-8xl font-black tracking-tighter mb-3">
          food
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--accent) 0%, #ff4d8d 60%, #b266ff 100%)",
            }}
          >
            r
          </span>
        </h1>
        <p className="text-xl text-[var(--muted)] max-w-xl mx-auto leading-relaxed">
          Rate fast food on its own scale.
          <br />
          <span className="text-[var(--foreground)]">
            Because every chain deserves to be judged as itself.
          </span>
        </p>
        <div className="mt-5 inline-block px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--muted)]">
          A{" "}
          <strong className="text-[var(--accent)]">4 out of 5 Wendy&apos;s</strong>{" "}
          actually means something.
        </div>
      </header>

      <section className="mb-8">
        <GlobalStats />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        <ChainGrid />
        <Leaderboard />
      </div>

      <footer className="text-center mt-20 text-xs text-[var(--muted)]">
        <p className="mb-1">
          foodr — fast food, rated fairly. Powered by a Rust backend with
          per-session proof-of-work and per-IP rate limiting.
        </p>
        <p>
          Your ratings persist across visits via a signed, HttpOnly session
          cookie. No tracking, no accounts.
        </p>
      </footer>
    </main>
  );
}
