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
import { explorerTx } from "../lib/pay";

// Monad blocks are sub-second, so a short poll is cheap and keeps the list live
// without a refresh. The scan itself is incremental from a checkpoint, so each
// poll reads one RPC-sized chunk and nothing more.
const POLL_MS = 4_000;

export function ActivityList({ address }: { address: `0x${string}` }) {
	const [entries, setEntries] = useState<ActivityEntry[]>(() =>
		applyNotes(loadEntries()),
	);
	const [scanning, setScanning] = useState(false);

	useEffect(() => {
		let cancelled = false;
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
		<section className="ppp-card">
			<h2>Payments received</h2>
			{entries.length === 0 ? (
				<p className="muted">
					Payments will appear here as clients pay your links. Nothing here yet.
				</p>
			) : (
				<ul className="activity">
					{entries.map((entry) => (
						<li key={entry.id}>
							<p className="balance-sm">{usdFromBaseUnits(entry.amount)}</p>
							<p className="muted">
								{`From ${entry.counterparty.slice(0, 6)}…${entry.counterparty.slice(-4)}`}
							</p>
							{entry.description && (
								<p className="muted">{`For: ${entry.description}`}</p>
							)}
							<p className="muted">
								{new Date(entry.timestamp * 1000).toLocaleString("en-US", {
									dateStyle: "medium",
									timeStyle: "short",
								})}
							</p>
							<a href={explorerTx(entry.hash)} target="_blank" rel="noreferrer">
								View on MonadScan
							</a>
						</li>
					))}
				</ul>
			)}
			{scanning && <p className="muted">Checking for new payments…</p>}
		</section>
	);
}
