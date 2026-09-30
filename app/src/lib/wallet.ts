import { createPublicClient, formatUnits, http, type Address } from "viem";
import { monadTestnet } from "viem/chains";

// USDC on Monad testnet (Monad token list)
export const USDC_TESTNET: Address = "0x534b2f3A21130d7a60830c2Df862319e593943A3";

const publicClient = createPublicClient({
	chain: monadTestnet,
	transport: http(),
});

const ERC20_BALANCE_ABI = [
	{
		name: "balanceOf",
		type: "function",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		name: "decimals",
		type: "function",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "uint8" }],
	},
] as const;

export async function getBalance(address: Address): Promise<string> {
	const [raw, decimals] = await Promise.all([
		publicClient.readContract({
			address: USDC_TESTNET,
			abi: ERC20_BALANCE_ABI,
			functionName: "balanceOf",
			args: [address],
		}),
		publicClient.readContract({
			address: USDC_TESTNET,
			abi: ERC20_BALANCE_ABI,
			functionName: "decimals",
		}),
	]);
	return formatUnits(raw, decimals);
}
