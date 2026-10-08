import { ArrowUpRight } from "@phosphor-icons/react";
import { useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { createWalletClient, custom } from "viem";
import { monadTestnet } from "viem/chains";
import { saveNote } from "../lib/activity";
import { parseAmount } from "../lib/amount";
import { fileRequest } from "../lib/api";
import { buildRequest, encodeLink, signRequest } from "../lib/request";
import { USDC_TESTNET } from "../lib/wallet";
import { Sheet } from "./Sheet";

// The reference puts Request beside Withdraw as a tile. The tile opens a
// bottom sheet with the same signing flow; the link result renders inside the
// sheet, so the homepage never grows a form section.
export function RequestTile({ recipient }: { recipient: `0x${string}` }) {
	const [open, setOpen] = useState(false);
	if (!open) {
		return (
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="rounded-[18px] border border-[var(--line)] bg-[var(--card)] p-4 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
			>
				<ArrowUpRight
					weight="bold"
					aria-hidden="true"
					className="size-5 text-[var(--teal)]"
				/>
				<span className="mt-2 block text-[15px] font-bold text-[var(--ink)]">
					Request payment
				</span>
				<span className="mt-1 block text-[13px] leading-snug text-[var(--ink-soft)]">
					Send a clear link in under a minute.
				</span>
			</button>
		);
	}
	return (
		<Sheet title="Request a payment" onClose={() => setOpen(false)}>
			<CreateRequest recipient={recipient} />
		</Sheet>
	);
}

export function CreateRequest({ recipient }: { recipient: `0x${string}` }) {
	const { wallets } = useWallets();
	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");
	const [requesterName, setRequesterName] = useState("");
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
				requesterName.trim(),
			);
			// Privy hands back an EIP-1193 provider; viem speaks it natively and
			// resolves the signing account from eth_accounts.
			const client = createWalletClient({
				chain: monadTestnet,
				transport: custom(await wallet.getEthereumProvider()),
			});
			// Privy types its address as string; the trust boundary already checked
			const signature = await signRequest(
				client,
				wallet.address as `0x${string}`,
				request,
			);
			// The description is unsigned prose that never reaches the chain. Saving
			// it here is what lets the recipient's browser label the payment later.
			saveNote(request.amount, recipient, request.description);
			// File the same signed blob under a short ULID so the shared link is
			// readable. Best-effort: if the database is unreachable the long
			// self-describing link below still works, so link creation never
			// depends on the server.
			const filed = await fileRequest({
				requesterAddress: recipient,
				recipient: request.recipient,
				token: request.token,
				amount: request.amount,
				nonce: request.nonce,
				expiry: request.expiry,
				signature,
				description: request.description,
				requesterName: request.requesterName,
			});
			setLink(
				filed
					? `${window.location.origin}/pay/${filed.id}`
					: encodeLink(request, signature, window.location.origin),
			);
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
		<>
			<h2>Request a payment</h2>
			<label className="ppp-field">
				<span>Your name</span>
				<input
					placeholder="Sarah"
					value={requesterName}
					onChange={(e) => setRequesterName(e.target.value)}
				/>
			</label>
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
		</>
	);
}
