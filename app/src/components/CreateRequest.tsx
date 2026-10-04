import { useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { createWalletClient, custom } from "viem";
import { monadTestnet } from "viem/chains";
import { parseAmount } from "../lib/amount";
import { buildRequest, encodeLink, signRequest } from "../lib/request";
import { USDC_TESTNET } from "../lib/wallet";

// The description is a note to the payer, so it rides in the URL unsigned rather
// than inside the signed data. The pay screen labels it as such.
export function CreateRequest({ recipient }: { recipient: `0x${string}` }) {
	const { wallets } = useWallets();
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [link, setLink] = useState("");
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	async function create() {
		const parsed = parseAmount(amount);
		if (!parsed.ok) {
			setError(parsed.reason);
			return;
		}
		const wallet = wallets?.[0];
		if (!wallet) {
			setError("Couldn't reach your wallet. Try again.");
			return;
		}
		setError("");
		setCopied(false);
		setBusy(true);
		try {
			const request = buildRequest(
				recipient,
				USDC_TESTNET,
				parsed.baseUnits,
				description.trim(),
			);
			// Privy hands back an EIP-1193 provider; viem speaks it natively and
			// resolves the signing account from eth_accounts.
			const client = createWalletClient({
				chain: monadTestnet,
				transport: custom(await wallet.getEthereumProvider()),
			});
			// Privy types its address as string; the trust boundary already checked
			// it is a well-formed 0x address in privyWalletAddress().
			const signature = await signRequest(
				client,
				wallet.address as `0x${string}`,
				request,
			);
			setLink(encodeLink(request, signature, window.location.origin));
		} catch {
			setError("Couldn't create the link. Try again.");
		} finally {
			setBusy(false);
		}
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(link);
			setCopied(true);
		} catch {
			setError("Couldn't copy. Select the link and copy it manually.");
		}
	}

	return (
		<section className="ppp-card">
			<h2>Request a payment</h2>
			<label className="ppp-field">
				<span>Amount (USDC)</span>
				<input
					inputMode="decimal"
					placeholder="25.00"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
				/>
			</label>
			<label className="ppp-field">
				<span>What&apos;s it for?</span>
				<input
					placeholder="Logo design"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
			</label>
			<button type="button" onClick={create} disabled={busy || link !== ""}>
				{busy ? "Creating…" : "Create link"}
			</button>
			{link && (
				<div className="ppp-result">
					<p className="muted">Send this link to your client:</p>
					<code className="ppp-link">{link}</code>
					<button type="button" className="ghost" onClick={copy}>
						{copied ? "Copied" : "Copy link"}
					</button>
				</div>
			)}
			{error && (
				<p role="alert" className="error">
					{error}
				</p>
			)}
		</section>
	);
}
