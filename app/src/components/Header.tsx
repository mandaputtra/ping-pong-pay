import { Link } from "@tanstack/react-router";

// One compact bar, borrowed in shape from Astro's top strip: identity on the
// left, environment on the right, nothing else. A payer's whole job on this
// screen is the card, so the chrome around it stays out of the way and the page
// is the same at every width.
export default function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-[var(--line-card)] bg-[var(--pay-bg)]/85 px-4 backdrop-blur-lg">
			<div className="mx-auto flex h-12 w-full max-w-[600px] items-center justify-between">
				<Link
					to="/"
					className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-[var(--text)] no-underline"
				>
					<span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
					Ping Pong Pay
				</Link>
				<span className="rounded-[var(--radius-full)] border border-[var(--line-card)] px-2.5 py-1 text-[11px] font-semibold tracking-wider text-[var(--text-subtle)] uppercase">
					Testnet
				</span>
			</div>
		</header>
	);
}
