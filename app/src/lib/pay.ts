import {
	type Address,
	createPublicClient,
	type Hex,
	http,
	parseAbi,
	type WalletClient,
} from "viem";
import { monadTestnet } from "viem/chains";
import { USDC_TESTNET } from "../lib/wallet";
import type { DecodedRequest } from "./request";

const ERC20_ABI = parseAbi([
	"event Transfer(address indexed from, address indexed to, uint256 value)",
	"function transfer(address to, uint256 amount) returns (bool)",
]);

// Monad charges the declared gasLimit, not gas used, so never let an estimate
// stand. Same reason the relayer passes an explicit value.
const TRANSFER_GAS = 100_000n;

// ponytail: replay detection scans a bounded window of recent blocks rather than
// the request's full 7-day life. The public Monad RPC rejects any eth_getLogs
// range wider than a few hundred blocks (verified: 100 works, 500 errors), so
// this is the widest window that reliably works. Swap for a per-nonce registry
// if links must stay replay-safe for their whole expiry.
const REPLAY_WINDOW_BLOCKS = 100n;

const publicClient = createPublicClient({
	chain: monadTestnet,
	transport: http(),
});

export type Receipt = {
	hash: Hex;
	amount: string;
	recipient: Address;
	paidAt: number; // unix seconds
};

// A payer who opens the same link twice must not be charged twice. This is the
// authority: the browser ledger in guards.ts is only a shortcut for rendering.
//
// The chain cannot see the offchain nonce, so the match is on the triple the
// signer committed to and the payer controls: this payer, this recipient, this
// exact amount. A different amount is a different payment, not a replay of this
// one.
export async function hasAlreadyPaid(
	payer: Address,
	request: DecodedRequest,
): Promise<boolean> {
	const latest = await publicClient.getBlockNumber();
	const fromBlock =
		latest > REPLAY_WINDOW_BLOCKS ? latest - REPLAY_WINDOW_BLOCKS : 0n;
	const logs = await publicClient.getLogs({
		address: USDC_TESTNET,
		event: ERC20_ABI[0],
		args: { from: payer, to: request.recipient },
		fromBlock,
		toBlock: latest,
	});
	// `value` is not a filterable topic, so match the exact amount on the logs.
	// An indexer or per-nonce registry is the upgrade if this scan grows.
	return logs.some((log) => log.args.value === BigInt(request.amount));
}

export async function payRequest(
	client: WalletClient,
	account: Address,
	request: DecodedRequest,
): Promise<Receipt> {
	const hash = await client.writeContract({
		account,
		address: request.token || USDC_TESTNET,
		abi: ERC20_ABI,
		functionName: "transfer",
		args: [request.recipient, BigInt(request.amount)],
		gas: TRANSFER_GAS,
		chain: monadTestnet,
	});
	return {
		hash,
		amount: request.amount,
		recipient: request.recipient,
		paidAt: Math.floor(Date.now() / 1000),
	};
}

export function explorerTx(hash: Hex): string {
	return `https://testnet.monadvision.com/tx/${hash}`;
}
