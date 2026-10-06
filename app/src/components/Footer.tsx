export default function Footer() {
	const year = new Date().getFullYear();

	// mt-auto pins the footer to the bottom of the page column on every page;
	// the content above it stays where it is.
	return (
		<footer className="mt-auto px-4 py-6 text-center text-[11px] text-[var(--text-subtle)]">
			<p className="m-0">
				&copy; {year} Ping Pong Pay. Testnet demo, no real money moves.
			</p>
		</footer>
	);
}
