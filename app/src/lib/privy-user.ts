import type { User } from "@privy-io/react-auth";
import type { Address } from "viem";

// The wallet ping-pong-pay transacts with: Privy's embedded wallet only. A foreign
// wallet (MetaMask etc.) is never ours, even when it verified first.
export function privyWalletAddress(user: User): Address | null {
	const wallets = [
		...user.linkedAccounts.filter((a) => a.type === "wallet"),
		...(user.wallet ? [user.wallet] : []),
	];
	const embedded = wallets.find((w) => w.walletClientType === "privy");
	return embedded ? (embedded.address as Address) : null;
}
