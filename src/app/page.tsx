import { chains } from "@/data/chains";
import ChainCard from "@/components/ChainCard";

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <header className="text-center mb-16">
        <h1 className="text-6xl font-black tracking-tight mb-2">
          food<span className="text-[var(--accent)]">r</span>
        </h1>
        <p className="text-xl text-[var(--muted)] max-w-xl mx-auto">
          Rate fast food on its own scale.
          <br />
          <span className="text-[var(--foreground)]">
            Because every chain deserves to be judged as itself.
          </span>
        </p>
        <div className="mt-6 inline-block px-4 py-2 rounded-full bg-[var(--card)] text-sm text-[var(--muted)]">
          No more meaningless 2.3 stars on Google Maps.
          <br />A <strong className="text-[var(--accent)]">
            4 out of 5 Wendy&apos;s
          </strong>{" "}
          actually means something.
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chains.map((chain) => (
          <ChainCard key={chain.id} chain={chain} />
        ))}
      </div>

      <footer className="text-center mt-20 text-sm text-[var(--muted)]">
        <p>foodr &mdash; fast food, rated fairly.</p>
      </footer>
    </main>
  );
}
