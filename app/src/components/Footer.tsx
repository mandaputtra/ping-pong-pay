export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
			<div className="page-wrap text-center">
				<p className="m-0 text-sm">
					&copy; {year} Ping Pong Pay. MIT licensed.
				</p>
				<p className="island-kicker m-0">
					Testnet demo. No real money moves.
				</p>
			</div>
		</footer>
	);
}