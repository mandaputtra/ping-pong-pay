import { useEffect, useState } from "react";

// The confirmation state is the one moment where motion earns its place: Apple
// singles out payments as the case where people want feedback that the payment
// went through. Everything else on this screen stays still.

type Kind = "swap" | "pending";

export function StatusSwap({ kind }: { kind: Kind }) {
	// One frame at the hidden state so the browser has an initial value to
	// transition from. A microtask rather than requestAnimationFrame: rAF is
	// throttled to a halt in a background tab and never fires in some headless
	// contexts, which would leave the confirmation permanently invisible. The
	// animation still runs on the compositor either way.
	const [shown, setShown] = useState(false);
	useEffect(() => {
		queueMicrotask(() => setShown(true));
	}, []);

	if (kind === "pending") {
		return (
			<div className="status-pending" aria-hidden="true">
				<span className="spinner" />
			</div>
		);
	}

	return (
		<div className="status-swap" data-shown={shown}>
			<svg
				className="checkmark"
				viewBox="0 0 24 24"
				aria-hidden="true"
				focusable="false"
			>
				<path d="M4 12.5l5.5 5.5L20 6.5" />
			</svg>
		</div>
	);
}
