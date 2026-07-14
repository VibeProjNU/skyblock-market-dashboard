import Link from "next/link";
import { getInvestmentHistoryData } from "@/lib/history/history-queries";
import type { ProductHistorySummary } from "@/lib/history/investment-signals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const futureColumns = [
  "product_id",
  "buy_order_price",
  "sell_offer_price",
  "spread",
  "margin_percent",
  "buy_volume",
  "sell_volume",
  "buy_moving_week",
  "sell_moving_week",
  "buy_orders",
  "sell_orders",
  "captured_at",
];

type InvestmentHistoryPageProps = {
  searchParams?: Promise<{
    product?: string;
  }>;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export default async function InvestmentHistoryPage({
  searchParams,
}: InvestmentHistoryPageProps) {
  const params = await searchParams;
  const history = await getInvestmentHistoryData(params?.product);
  const selectedProduct = history.selectedProduct;

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link
            className="rounded-md border border-slate-700 px-3 py-2 font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
            href="/"
          >
            Bazaar Dashboard
          </Link>
          <Link
            className="rounded-md bg-cyan-400 px-3 py-2 font-semibold text-slate-950"
            href="/investment-history"
          >
            Investment History
          </Link>
        </nav>

        <section className="border-b border-slate-800 pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
            Supabase History
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
            Investment History
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            This page reads saved Bazaar snapshots from Supabase. It does not
            generate fake history. If there are not enough real snapshots yet,
            signals are marked as insufficient data.
          </p>
        </section>

        {history.error ? (
          <div className="rounded-md border border-amber-400/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            {history.error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Saved rows"
            value={integerFormatter.format(history.snapshotCount)}
          />
          <Metric
            label="Tracked products"
            value={integerFormatter.format(history.products.length)}
          />
          <Metric
            label="Latest snapshot"
            value={
              history.latestCapturedAt
                ? formatDateTime(history.latestCapturedAt)
                : "None yet"
            }
          />
          <Metric
            label="Selected product"
            value={history.selectedProductId ?? "None"}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4 shadow-2xl shadow-black/20">
            <h2 className="text-lg font-semibold text-white">
              Historical Signal
            </h2>
            {selectedProduct ? (
              <SignalPanel product={selectedProduct} />
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-300">
                No saved Bazaar snapshots are available yet. Run the manual
                snapshot collection route after configuring Supabase.
              </p>
            )}
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4 shadow-2xl shadow-black/20">
            <h2 className="text-lg font-semibold text-white">
              Snapshot Table Shape
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The page expects real rows from{" "}
              <span className="text-cyan-200">bazaar_snapshots</span>. These
              columns are ready for daily scheduled collection.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {futureColumns.map((column) => (
                <span
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                  key={column}
                >
                  {column}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-800 bg-slate-950/70 shadow-2xl shadow-black/20">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-lg font-semibold text-white">
              Saved Product History
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              These rows are calculated from real saved snapshots only.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                <tr>
                  <th className="border-b border-slate-800 px-3 py-3 text-left font-semibold">
                    Product
                  </th>
                  <th className="border-b border-slate-800 px-3 py-3 text-left font-semibold">
                    Signal
                  </th>
                  <th className="border-b border-slate-800 px-3 py-3 text-right font-semibold">
                    Latest Buy Order
                  </th>
                  <th className="border-b border-slate-800 px-3 py-3 text-right font-semibold">
                    24h Avg
                  </th>
                  <th className="border-b border-slate-800 px-3 py-3 text-right font-semibold">
                    7d Avg
                  </th>
                  <th className="border-b border-slate-800 px-3 py-3 text-right font-semibold">
                    28d Avg
                  </th>
                  <th className="border-b border-slate-800 px-3 py-3 text-right font-semibold">
                    Volatility
                  </th>
                  <th className="border-b border-slate-800 px-3 py-3 text-right font-semibold">
                    Snapshots
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.products.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-10 text-center text-slate-400"
                      colSpan={8}
                    >
                      No real historical snapshots found.
                    </td>
                  </tr>
                ) : null}
                {history.products.map((product) => (
                  <tr
                    className="border-b border-slate-900/90 transition hover:bg-slate-800/45"
                    key={product.productId}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-100">
                      <Link
                        className="hover:text-cyan-200"
                        href={`/investment-history?product=${encodeURIComponent(product.productId)}`}
                      >
                        {product.productId}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <SignalBadge signal={product.signal} />
                    </td>
                    <td className="px-3 py-3 text-right text-slate-200">
                      {formatCoins(product.latest.buy_order_price)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-200">
                      {formatOptionalCoins(product.average24h)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-200">
                      {formatOptionalCoins(product.average7d)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-200">
                      {formatOptionalCoins(product.average28d)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-200">
                      {formatOptionalPercent(product.volatilityPercent)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-200">
                      {integerFormatter.format(product.snapshotCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function SignalPanel({ product }: { product: ProductHistorySummary }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Product
        </div>
        <div className="mt-2 font-semibold text-white">{product.productId}</div>
      </div>
      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Signal
        </div>
        <div className="mt-2">
          <SignalBadge signal={product.signal} />
        </div>
      </div>
      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          28d Avg
        </div>
        <div className="mt-2 font-semibold text-white">
          {formatOptionalCoins(product.average28d)}
        </div>
      </div>
      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          30d Avg
        </div>
        <div className="mt-2 font-semibold text-white">
          {formatOptionalCoins(product.average30d)}
        </div>
      </div>
      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
          Volume Spike
        </div>
        <div className="mt-2 font-semibold text-white">
          {product.volumeSpike ? "Detected" : "Not detected"}
        </div>
      </div>
      <p className="sm:col-span-2 text-sm leading-6 text-slate-300">
        {product.reason}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4 shadow-xl shadow-black/10">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function SignalBadge({ signal }: { signal: ProductHistorySummary["signal"] }) {
  const className =
    signal === "buy"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      : signal === "watch"
        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
        : signal === "avoid"
          ? "border-red-400/40 bg-red-400/10 text-red-200"
          : "border-slate-600 bg-slate-800 text-slate-300";

  return (
    <span
      className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase ${className}`}
    >
      {signal}
    </span>
  );
}

function formatCoins(value: number) {
  return currencyFormatter.format(value);
}

function formatOptionalCoins(value: number | null) {
  return value === null ? "Not enough data" : formatCoins(value);
}

function formatOptionalPercent(value: number | null) {
  return value === null ? "Not enough data" : `${percentFormatter.format(value)}%`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
