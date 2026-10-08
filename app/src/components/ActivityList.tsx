import { useEffect, useState } from "react";
import {
	type ActivityEntry,
	applyNotes,
	loadEntries,
	mergeEntries,
	saveEntries,
	scanIncoming,
} from "../lib/activity";
import { usdFromBaseUnits } from "../lib/amount";
import { type ApiRequest, fetchHistory } from "../lib/api";
import { explorerTx } from "../lib/pay";

// Monad blocks are sub-second, so a short poll is cheap and keeps the list live
// without a refresh. The scan itself is incremental from a checkpoint, so each
// poll reads one RPC-sized chunk and nothing more.
const POLL_MS = 4_000;

function initialsOf(name: string): string {
	const clean = name.trim();
	if (!clean) return "··";
	const parts = clean.split(/\s+/);
	return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// One request row, matching the reference: avatar chip with initials, title
// plus date on the left, mono amount plus dot status on the right. Chain
// receipts link out to the explorer; filed requests are history, not links.
function RequestRow({
	initials,
	title,
	date,
	amount,
	paid,
	href,
}: {
	initials: string;
	title: string;
	date: Date;
	amount: string;
	paid: boolean;
	href?: string;
}) {
	const body = (
		<>
			<span
				aria-hidden="true"
				className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--paper-deep)] text-[13px] font-bold text-[var(--ink-soft)]"
			>
				{initials}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-[15px] font-bold text-[var(--ink)]">
					{title}
				</span>
				<span className="mt-0.5 block text-[13px] text-[var(--ink-faint)]">
					{date.toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
					})}
				</span>
			</span>
			<span className="shrink-0 text-right">
				<span className="block font-mono text-[15px] font-semibold text-[var(--ink)] tabular-nums">
					{amount}
				</span>
				<span
					className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] font-semibold tracking-wider uppercase ${
						paid ? "text-[var(--green)]" : "text-[var(--amber)]"
					}`}
				>
					<span
						aria-hidden="true"
						className={`size-1.5 rounded-full ${paid ? "bg-[var(--green)]" : "bg-[var(--amber)]"}`}
					/>
					{paid ? "Paid" : "Pending"}
				</span>
			</span>
		</>
	);
	const cls =
		"flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--card)] px-3.5 py-3";
	return href ? (
		<li>
			<a
				href={href}
				target="_blank"
				rel="noreferrer"
				className={`${cls} transition-transform duration-150 ease-out active:scale-[0.99]`}
			>
				{body}
			</a>
		</li>
	) : (
		<li className={cls}>{body}</li>
	);
}

export function ActivityList({ address }: { address: `0x${string}` }) {
	const [entries, setEntries] = useState<ActivityEntry[]>(() =>
		applyNotes(loadEntries()),
	);
	const [requests, setRequests] = useState<ApiRequest[]>([]);
	const [scanning, setScanning] = useState(false);

	useEffect(() => {
		let cancelled = false;
		// The database is the requester's own history: every link they minted
		// and whether it is paid. The chain scan below is what they received.
		// Either source failing leaves the other on screen.
		fetchHistory(address).then((found) => {
			if (!cancelled && found) setRequests(found.requests);
		});
		let timer: ReturnType<typeof setTimeout>;

		async function tick() {
			setScanning(true);
			try {
				const { entries: fresh } = await scanIncoming(address);
				if (cancelled) return;
				// Merge, never replace: the stored list is what survives a reload.
				const merged = applyNotes(mergeEntries(loadEntries(), fresh));
				saveEntries(merged);
				setEntries(merged);
			} catch {
				// A failed poll keeps the last good list on screen; the next tick retries.
			} finally {
				setScanning(false);
				if (!cancelled) timer = setTimeout(tick, POLL_MS);
			}
		}

		tick();
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [address]);

	return (
		<section aria-label="Recent requests" className="mt-6">
			<div className="flex items-baseline justify-between">
				<h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold text-[var(--ink)]">
					Recent requests
				</h2>
				{scanning && (
					<p className="font-mono text-[11px] text-[var(--ink-faint)]">
						live refresh · 1.5s
					</p>
				)}
			</div>
			{requests.length === 0 && entries.length === 0 ? (
				<p className="mt-3 text-sm text-[var(--ink-soft)]">
					Payments will appear here as clients pay your links. Nothing here yet.
				</p>
			) : (
				<ul className="mt-3 space-y-2.5">
					{requests.map((r) => (
						<RequestRow
							key={r.id}
							initials={initialsOf(r.requester_name)}
							title={r.description || "Payment request"}
							date={new Date(r.created_at)}
							amount={usdFromBaseUnits(r.amount)}
							paid={r.paid}
						/>
					))}
					{entries.map((entry) => (
						<RequestRow
							key={entry.id}
							initials="··"
							title={entry.description || "Payment received"}
							date={new Date(entry.timestamp * 1000)}
							amount={usdFromBaseUnits(entry.amount)}
							paid
							href={explorerTx(entry.hash)}
						/>
					))}
				</ul>
			)}
		</section>
	);
}
