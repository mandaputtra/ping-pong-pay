import type { Address, Hex } from "viem";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";
import { release, reserve, TOPUP_AMOUNT } from "./cap.ts";

export { TOPUP_AMOUNT } from "./cap.ts";

const USDC_TESTNET: Address = "0x534b2f3A21130d7a60830c2Df862319e593943A3";

const ERC20_ABI = parseAbi([
	"function transfer(address to, uint256 amount) returns (bool)",
]);

// Monad charges the declared gasLimit, not gas used, so never let an estimate stand.
const TRANSFER_GAS = 100_000n;

const publicClient = createPublicClient({
	chain: monadTestnet,
	transport: http(),
});

export function relayerAccount() {
	const key = process.env.RELAYER_PRIVATE_KEY;
	if (!key) throw new Error("RELAYER_PRIVATE_KEY is not set");
	return privateKeyToAccount(key as `0x${string}`);
}

export async function topUp(address: Address): Promise<Hex> {
	const prior = reserve(address);
	try {
		const client = createWalletClient({
			account: relayerAccount(),
			chain: monadTestnet,
			transport: http(),
		});
		const hash = await client.writeContract({
			address: USDC_TESTNET,
			abi: ERC20_ABI,
			functionName: "transfer",
			args: [address, TOPUP_AMOUNT],
			gas: TRANSFER_GAS,
		});
		await publicClient.waitForTransactionReceipt({ hash });
		return hash;
	} catch (err) {
		release(address, prior);
		throw err;
	}
}
