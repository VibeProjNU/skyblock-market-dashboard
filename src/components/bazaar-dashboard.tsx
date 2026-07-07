"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BazaarMarketProduct,
  BazaarSnapshot,
} from "@/lib/hypixel/bazaar-types";

type SortKey =
  | "productId"
  | "instantBuyPrice"
  | "instantSellPrice"
  | "spread"
  | "marginPercent"
  | "buyVolume"
  | "sellVolume"
  | "buyMovingWeek"
  | "sellMovingWeek"
  | "buyOrders"
  | "sellOrders"
  | "fillConfidence"
  | "flipScore";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

type Filters = {
  search: string;
  minMargin: string;
  maxMargin: string;
  minSpread: string;
  minVolume: string;
  minBuyOrders: string;
  minSellOrders: string;
};

const columns: { key: SortKey; label: string; align?: "left" | "right" }[] = [
  { key: "productId", label: "Product", align: "left" },
  { key: "instantSellPrice", label: "Buy Order" },
  { key: "instantBuyPrice", label: "Sell Offer" },
  { key: "spread", label: "Spread" },
  { key: "marginPercent", label: "Margin" },
  { key: "buyVolume", label: "Buy Vol" },
  { key: "sellVolume", label: "Sell Vol" },
  { key: "buyMovingWeek", label: "Buy Week" },
  { key: "sellMovingWeek", label: "Sell Week" },
  { key: "buyOrders", label: "Buy Orders" },
  { key: "sellOrders", label: "Sell Orders" },
  { key: "fillConfidence", label: "Fill Conf" },
  { key: "flipScore", label: "Flip Score" },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

async function getFreshBazaarSnapshot() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`/api/bazaar?refresh=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(errorBody?.error ?? "The Bazaar refresh request failed.");
    }

    return (await response.json()) as BazaarSnapshot;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function BazaarDashboard({
  initialSnapshot,
}: {
  initialSnapshot?: BazaarSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<BazaarSnapshot | null>(
    initialSnapshot ?? null,
  );
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(Boolean(initialSnapshot));
  const [filters, setFilters] = useState<Filters>({
    search: "",
    minMargin: "",
    maxMargin: "",
    minSpread: "",
    minVolume: "",
    minBuyOrders: "",
    minSellOrders: "",
  });
  const [sort, setSort] = useState<SortState>({
    key: "flipScore",
    direction: "desc",
  });
  const [isRefreshing, setIsRefreshing] = useState(!initialSnapshot);
  const [refreshStartedAt, setRefreshStartedAt] = useState<string | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);

  const refreshData = useCallback(async () => {
    setError("");
    setRefreshStartedAt(new Date().toISOString());
    setIsRefreshing(true);

    try {
      const nextSnapshot = await getFreshBazaarSnapshot();
      setSnapshot(nextSnapshot);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh Bazaar data.",
      );
    } finally {
      setHasLoaded(true);
      setIsRefreshing(false);
      setRefreshStartedAt(null);
    }
  }, []);

  useEffect(() => {
    if (initialSnapshot) {
      return;
    }

    let shouldIgnore = false;

    async function loadInitialData() {
      setRefreshStartedAt(new Date().toISOString());

      try {
        const nextSnapshot = await getFreshBazaarSnapshot();

        if (!shouldIgnore) {
          setSnapshot(nextSnapshot);
          setError("");
        }
      } catch (refreshError) {
        if (!shouldIgnore) {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Unable to refresh Bazaar data.",
          );
        }
      } finally {
        if (!shouldIgnore) {
          setHasLoaded(true);
          setIsRefreshing(false);
          setRefreshStartedAt(null);
        }
      }
    }

    void loadInitialData();

    return () => {
      shouldIgnore = true;
    };
  }, [initialSnapshot]);

  useEffect(() => {
    const filterPanel = filterPanelRef.current;

    if (!filterPanel) {
      return;
    }

    const filterPanelElement = filterPanel;

    function readFilterInputs() {
      const nextFilters: Partial<Filters> = {};

      filterPanelElement
        .querySelectorAll<HTMLInputElement>("input[data-filter-key]")
        .forEach((input) => {
          const key = input.dataset.filterKey as keyof Filters | undefined;

          if (key) {
            nextFilters[key] = input.value;
          }
        });

      return nextFilters;
    }

    function syncFilterInputs() {
      const nextFilters = readFilterInputs();

      setFilters((current) => {
        const changedKeys = Object.entries(nextFilters).filter(
          ([key, value]) => current[key as keyof Filters] !== value,
        );

        if (changedKeys.length === 0) {
          return current;
        }

        return { ...current, ...nextFilters };
      });
    }

    const syncTimer = window.setInterval(syncFilterInputs, 200);

    filterPanelElement.addEventListener("input", syncFilterInputs);

    return () => {
      window.clearInterval(syncTimer);
      filterPanelElement.removeEventListener("input", syncFilterInputs);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const search = filters.search.trim().toLowerCase();
    const minMargin = parseOptionalFilter(filters.minMargin);
    const maxMargin = parseOptionalFilter(filters.maxMargin);
    const minSpread = parseOptionalFilter(filters.minSpread);
    const minVolume = parseOptionalFilter(filters.minVolume);
    const minBuyOrders = parseOptionalFilter(filters.minBuyOrders);
    const minSellOrders = parseOptionalFilter(filters.minSellOrders);

    return snapshot.products
      .filter((product) => {
        const matchesSearch =
          !search ||
          product.productId.toLowerCase().includes(search) ||
          product.displayName.toLowerCase().includes(search);
        const liquidity = Math.min(product.buyVolume, product.sellVolume);

        return (
          matchesSearch &&
          (minMargin === null || product.marginPercent >= minMargin) &&
          (maxMargin === null || product.marginPercent <= maxMargin) &&
          (minSpread === null || product.spread >= minSpread) &&
          (minVolume === null || liquidity >= minVolume) &&
          (minBuyOrders === null || (product.buyOrders ?? 0) >= minBuyOrders) &&
          (minSellOrders === null || (product.sellOrders ?? 0) >= minSellOrders)
        );
      })
      .sort((a, b) => compareProducts(a, b, sort));
  }, [filters, snapshot, sort]);

  const filteredTopScore = useMemo(
    () =>
      filteredProducts.reduce<BazaarMarketProduct | undefined>(
        (topProduct, product) =>
          !topProduct || product.flipScore > topProduct.flipScore
            ? product
            : topProduct,
        undefined,
      ),
    [filteredProducts],
  );

  const summary = useMemo(() => {
    if (!snapshot) {
      return {
        positiveCount: 0,
        totalBuyVolume: 0,
        totalSellVolume: 0,
      };
    }

    const opportunities = snapshot.products.filter(
      (product) => product.flipScore > 0,
    );
    const totalBuyVolume = snapshot.products.reduce(
      (sum, product) => sum + product.buyVolume,
      0,
    );
    const totalSellVolume = snapshot.products.reduce(
      (sum, product) => sum + product.sellVolume,
      0,
    );

    return {
      positiveCount: opportunities.length,
      totalBuyVolume,
      totalSellVolume,
    };
  }, [snapshot]);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function updateSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1540px] flex-col gap-5">
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link
            className="rounded-md bg-cyan-400 px-3 py-2 font-semibold text-slate-950"
            href="/"
          >
            Bazaar Dashboard
          </Link>
          <Link
            className="rounded-md border border-slate-700 px-3 py-2 font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
            href="/investment-history"
          >
            Investment History
          </Link>
        </nav>

        <section className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Hypixel Bazaar
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              SkyBlock Market Dashboard
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Live Bazaar opportunities ranked by a transparent score using
              margin, spread, and liquidity. Positive spread is calculated for
              buy order to sell offer flips, not instant buy to instant sell.
              Table prices are labeled for that order-flip workflow. It is an
              opportunity-ranking metric, not a profit guarantee.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-slate-800 bg-slate-950/70 p-3 text-sm shadow-2xl shadow-black/20 sm:min-w-80">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Last refreshed</span>
              <span
                className="font-medium text-slate-100"
                data-last-refreshed-label
              >
                {isRefreshing && refreshStartedAt
                  ? `Refreshing since ${formatTime(refreshStartedAt)}`
                  : snapshot
                    ? formatDateTime(snapshot.lastUpdated)
                    : "Loading"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Hypixel timestamp</span>
              <span className="font-medium text-slate-100">
                {snapshot ? formatDateTime(snapshot.sourceLastUpdated) : "Loading"}
              </span>
            </div>
            <button
              className="mt-2 rounded-md bg-cyan-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              data-refresh-button
              disabled={isRefreshing}
              onClick={() => void refreshData()}
              type="button"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-md border border-red-400/40 bg-red-950/50 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Products"
            value={integerFormatter.format(snapshot?.productCount ?? 0)}
          />
          <Metric
            label="Order-flip spreads"
            value={integerFormatter.format(summary.positiveCount)}
          />
          <Metric
            label="Buy volume"
            value={integerFormatter.format(summary.totalBuyVolume)}
          />
          <Metric
            label="Sell volume"
            value={integerFormatter.format(summary.totalSellVolume)}
          />
        </section>

        <section className="rounded-md border border-slate-800 bg-slate-950/70 shadow-2xl shadow-black/20">
          <div
            className="grid gap-3 border-b border-slate-800 p-4 md:grid-cols-2 xl:grid-cols-6"
            ref={filterPanelRef}
          >
            <label className="flex flex-col gap-2 text-sm text-slate-300">
              Search
              <input
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
                data-filter-key="search"
                onChange={(event) => updateFilter("search", event.currentTarget.value)}
                onInput={(event) => updateFilter("search", event.currentTarget.value)}
                placeholder="ENCHANTED_DIAMOND or Diamond"
                value={filters.search}
              />
            </label>
            <MarginRangeFilter
              maxValue={filters.maxMargin}
              minValue={filters.minMargin}
              onMaxChange={(value) => updateFilter("maxMargin", value)}
              onMinChange={(value) => updateFilter("minMargin", value)}
            />
            <NumberFilter
              filterKey="minSpread"
              label="Minimum coin spread"
              onChange={(value) => updateFilter("minSpread", value)}
              value={filters.minSpread}
            />
            <NumberFilter
              filterKey="minVolume"
              label="Minimum two-sided volume"
              onChange={(value) => updateFilter("minVolume", value)}
              value={filters.minVolume}
            />
            <NumberFilter
              filterKey="minBuyOrders"
              label="Minimum buy orders"
              onChange={(value) => updateFilter("minBuyOrders", value)}
              value={filters.minBuyOrders}
            />
            <NumberFilter
              filterKey="minSellOrders"
              label="Minimum sell orders"
              onChange={(value) => updateFilter("minSellOrders", value)}
              value={filters.minSellOrders}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 text-sm text-slate-400">
            <span
              data-showing-count
              data-total-count={snapshot?.productCount ?? 0}
            >
              Showing {integerFormatter.format(filteredProducts.length)} of{" "}
              {integerFormatter.format(snapshot?.productCount ?? 0)} products
            </span>
            {filteredTopScore ? (
              <span
                className="hidden text-right text-slate-300 md:block"
                data-top-score-label
              >
                Top score: {filteredTopScore.displayName}
              </span>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] border-collapse text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                <tr>
                  {columns.map((column) => (
                    <th
                      className={`border-b border-slate-800 px-3 py-3 font-semibold ${
                        column.align === "left" ? "text-left" : "text-right"
                      }`}
                      key={column.key}
                    >
                      <button
                        className={`inline-flex w-full items-center gap-1 ${
                          column.align === "left"
                            ? "justify-start"
                            : "justify-end"
                        } hover:text-cyan-200`}
                        onClick={() => updateSort(column.key)}
                        type="button"
                      >
                        {column.label}
                        <span className="text-[10px] text-cyan-300">
                          {sort.key === column.key
                            ? sort.direction === "desc"
                              ? "v"
                              : "^"
                            : ""}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!hasLoaded && !snapshot ? (
                  <tr>
                    <td
                      className="px-3 py-10 text-center text-slate-400"
                      colSpan={columns.length}
                    >
                      Loading live Bazaar data...
                    </td>
                  </tr>
                ) : null}
                {hasLoaded && !snapshot && error ? (
                  <tr>
                    <td
                      className="px-3 py-10 text-center text-red-200"
                      colSpan={columns.length}
                    >
                      Bazaar data could not be loaded. Use Refresh to try again.
                    </td>
                  </tr>
                ) : null}
                {snapshot && filteredProducts.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-10 text-center text-slate-400"
                      colSpan={columns.length}
                    >
                      No products match the current filters.
                    </td>
                  </tr>
                ) : null}
                {filteredProducts.map((product) => (
                  <tr
                    className="border-b border-slate-900/90 transition hover:bg-slate-800/45"
                    data-buy-orders={product.buyOrders ?? 0}
                    data-liquidity={Math.min(
                      product.buyVolume,
                      product.sellVolume,
                    )}
                    data-display-name={product.displayName}
                    data-flip-score={product.flipScore}
                    data-margin={product.marginPercent}
                    data-product-row
                    data-search-text={`${product.productId} ${product.displayName}`.toLowerCase()}
                    data-sell-orders={product.sellOrders ?? 0}
                    data-spread={product.spread}
                    key={product.productId}
                  >
                    <td className="px-3 py-3 text-left">
                      <div className="font-semibold text-slate-100">
                        {product.displayName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {product.productId}
                      </div>
                    </td>
                    <NumericCell value={product.instantSellPrice} />
                    <NumericCell value={product.instantBuyPrice} />
                    <NumericCell
                      highlight={product.spread > 0 ? "good" : "bad"}
                      value={product.spread}
                    />
                    <td
                      className={`px-3 py-3 text-right font-medium ${
                        product.marginPercent > 0
                          ? "text-emerald-300"
                          : "text-red-300"
                      }`}
                    >
                      {percentFormatter.format(product.marginPercent)}%
                    </td>
                    <NumericCell integer value={product.buyVolume} />
                    <NumericCell integer value={product.sellVolume} />
                    <OptionalCell value={product.buyMovingWeek} />
                    <OptionalCell value={product.sellMovingWeek} />
                    <OptionalCell value={product.buyOrders} />
                    <OptionalCell value={product.sellOrders} />
                    <td className="px-3 py-3 text-right font-medium text-slate-200">
                      {percentFormatter.format(product.fillConfidence * 100)}%
                    </td>
                    <NumericCell
                      highlight={product.flipScore > 0 ? "score" : "bad"}
                      value={product.flipScore}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <script
            dangerouslySetInnerHTML={{ __html: bazaarFilterFallbackScript }}
          />
        </section>
      </div>
    </main>
  );
}

const bazaarFilterFallbackScript = String.raw`
(() => {
  if (window.__skyblockBazaarFiltersInstalled) {
    return;
  }

  window.__skyblockBazaarFiltersInstalled = true;

  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  });
  let refreshInProgress = false;

  function parseOptionalNumber(value) {
    if (!value || value.trim() === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function inputValue(key) {
    const input = document.querySelector('[data-filter-key="' + key + '"]');
    return input instanceof HTMLInputElement ? input.value : "";
  }

  function applyBazaarFilters() {
    const rows = Array.from(document.querySelectorAll("[data-product-row]"));

    if (rows.length === 0) {
      return;
    }

    const search = inputValue("search").trim().toLowerCase();
    const minMargin = parseOptionalNumber(inputValue("minMargin"));
    const maxMargin = parseOptionalNumber(inputValue("maxMargin"));
    const minSpread = parseOptionalNumber(inputValue("minSpread"));
    const minVolume = parseOptionalNumber(inputValue("minVolume"));
    const minBuyOrders = parseOptionalNumber(inputValue("minBuyOrders"));
    const minSellOrders = parseOptionalNumber(inputValue("minSellOrders"));
    let visibleCount = 0;
    let topScore = -Infinity;
    let topScoreName = "";

    rows.forEach((row) => {
      const margin = Number(row.dataset.margin || 0);
      const spread = Number(row.dataset.spread || 0);
      const liquidity = Number(row.dataset.liquidity || 0);
      const buyOrders = Number(row.dataset.buyOrders || 0);
      const sellOrders = Number(row.dataset.sellOrders || 0);
      const flipScore = Number(row.dataset.flipScore || 0);
      const searchText = row.dataset.searchText || "";
      const matches =
        (!search || searchText.includes(search)) &&
        (minMargin === null || margin >= minMargin) &&
        (maxMargin === null || margin <= maxMargin) &&
        (minSpread === null || spread >= minSpread) &&
        (minVolume === null || liquidity >= minVolume) &&
        (minBuyOrders === null || buyOrders >= minBuyOrders) &&
        (minSellOrders === null || sellOrders >= minSellOrders);

      row.hidden = !matches;

      if (matches) {
        visibleCount += 1;

        if (flipScore > topScore) {
          topScore = flipScore;
          topScoreName = row.dataset.displayName || "";
        }
      }
    });

    const showingCount = document.querySelector("[data-showing-count]");
    const totalCount = Number(showingCount?.getAttribute("data-total-count"));

    if (showingCount) {
      showingCount.textContent =
        "Showing " +
        formatter.format(visibleCount) +
        " of " +
        formatter.format(Number.isFinite(totalCount) ? totalCount : rows.length) +
        " products";
    }

    const topScoreLabel = document.querySelector("[data-top-score-label]");

    if (topScoreLabel) {
      topScoreLabel.textContent = topScoreName
        ? "Top score: " + topScoreName
        : "Top score: No matching products";
    }
  }

  document.addEventListener("input", (event) => {
    const target = event.target;

    if (
      target instanceof HTMLInputElement &&
      target.hasAttribute("data-filter-key")
    ) {
      applyBazaarFilters();
    }
  });

  document.addEventListener(
    "click",
    async (event) => {
      const target = event.target;
      const button =
        target instanceof Element ? target.closest("[data-refresh-button]") : null;

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (refreshInProgress) {
        return;
      }

      refreshInProgress = true;
      button.disabled = true;
      button.textContent = "Refreshing...";

      const lastRefreshedLabel = document.querySelector(
        "[data-last-refreshed-label]",
      );

      if (lastRefreshedLabel) {
        lastRefreshedLabel.textContent = "Refreshing...";
      }

      try {
        const response = await fetch("/api/bazaar?refresh=" + Date.now(), {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("The Bazaar refresh request failed.");
        }

        window.location.reload();
      } catch (error) {
        refreshInProgress = false;
        button.disabled = false;
        button.textContent = "Refresh";

        if (lastRefreshedLabel) {
          lastRefreshedLabel.textContent = "Refresh failed";
        }
      }
    },
    true,
  );

  window.setInterval(applyBazaarFilters, 250);
  window.setTimeout(applyBazaarFilters, 0);
})();
`;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4 shadow-xl shadow-black/10">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function NumberFilter({
  filterKey,
  label,
  onChange,
  value,
}: {
  filterKey: keyof Filters;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-300">
      {label}
      <input
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
        data-filter-key={filterKey}
        min="0"
        onChange={(event) => onChange(event.currentTarget.value)}
        onInput={(event) => onChange(event.currentTarget.value)}
        placeholder="0"
        type="number"
        value={value}
      />
    </label>
  );
}

function MarginRangeFilter({
  maxValue,
  minValue,
  onMaxChange,
  onMinChange,
}: {
  maxValue: string;
  minValue: string;
  onMaxChange: (value: string) => void;
  onMinChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-300">
      Margin range %
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input
          className="min-w-0 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
          data-filter-key="minMargin"
          onChange={(event) => onMinChange(event.currentTarget.value)}
          onInput={(event) => onMinChange(event.currentTarget.value)}
          placeholder="Min"
          type="number"
          value={minValue}
        />
        <span className="text-slate-500">-</span>
        <input
          className="min-w-0 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300"
          data-filter-key="maxMargin"
          onChange={(event) => onMaxChange(event.currentTarget.value)}
          onInput={(event) => onMaxChange(event.currentTarget.value)}
          placeholder="Max"
          type="number"
          value={maxValue}
        />
      </div>
    </label>
  );
}

function NumericCell({
  highlight,
  integer,
  value,
}: {
  highlight?: "good" | "bad" | "score";
  integer?: boolean;
  value: number;
}) {
  const color =
    highlight === "good"
      ? "text-emerald-300"
      : highlight === "bad"
        ? "text-red-300"
        : highlight === "score"
          ? "text-cyan-200"
          : "text-slate-200";

  return (
    <td className={`px-3 py-3 text-right font-medium ${color}`}>
      {integer
        ? integerFormatter.format(value)
        : currencyFormatter.format(value)}
    </td>
  );
}

function OptionalCell({ value }: { value?: number }) {
  return (
    <td className="px-3 py-3 text-right text-slate-300">
      {typeof value === "number" ? integerFormatter.format(value) : "-"}
    </td>
  );
}

function parseOptionalFilter(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getSortableValue(product: BazaarMarketProduct, key: SortKey) {
  const value = product[key];
  return typeof value === "number" || typeof value === "string" ? value : 0;
}

function compareProducts(
  a: BazaarMarketProduct,
  b: BazaarMarketProduct,
  sort: SortState,
) {
  const aValue = getSortableValue(a, sort.key);
  const bValue = getSortableValue(b, sort.key);
  const direction = sort.direction === "asc" ? 1 : -1;

  if (typeof aValue === "string" && typeof bValue === "string") {
    return aValue.localeCompare(bValue) * direction;
  }

  const primary = (Number(aValue) - Number(bValue)) * direction;

  if (primary !== 0 || sort.key !== "flipScore") {
    return primary;
  }

  const aVolume = Math.min(a.buyVolume, a.sellVolume);
  const bVolume = Math.min(b.buyVolume, b.sellVolume);
  const volumeTieBreak = bVolume - aVolume;

  if (volumeTieBreak !== 0) {
    return volumeTieBreak;
  }

  return b.spread - a.spread;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeStyle: "medium",
  }).format(new Date(value));
}
