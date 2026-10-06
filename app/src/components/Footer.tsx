export default function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="px-4 py-6 text-center text-[11px] text-[var(--text-subtle)]">
			<p className="m-0">
				&copy; {year} Ping Pong Pay. Testnet demo, no real money moves.
			</p>
		</footer>
	);
}
