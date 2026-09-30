import type { User, Wallet } from "@privy-io/react-auth";
import { describe, expect, it } from "vitest";
import { privyWalletAddress } from "./privy-user";

function embedded(address: string): Wallet {
	return {
		address,
		chainType: "ethereum",
		walletClientType: "privy",
		imported: false,
		delegated: false,
		walletIndex: 0,
	};
}

function foreign(address: string): Wallet {
	return {
		address,
		chainType: "ethereum",
		walletClientType: "metamask",
		imported: false,
		delegated: false,
		walletIndex: null,
	};
}

function user(overrides: Partial<User>): User {
	return {
		id: "did:privy:test",
		createdAt: new Date(0),
		linkedAccounts: [],
		...overrides,
	} as User;
}

const DEA = "0x000000000000000000000000000000000000dEaD";
const BEE = "0x1111111111111111111111111111111111111111";

describe("privyWalletAddress", () => {
	it("prefers the Privy embedded wallet over a foreign one", () => {
		const u = user({
			wallet: foreign(DEA),
			linkedAccounts: [
				{
					...embedded(BEE),
					type: "wallet",
					firstVerifiedAt: null,
					latestVerifiedAt: null,
				},
			],
		});
		expect(privyWalletAddress(u)).toBe(BEE);
	});

	it("falls back to user.wallet when it is already embedded", () => {
		const u = user({ wallet: embedded(DEA), linkedAccounts: [] });
		expect(privyWalletAddress(u)).toBe(DEA);
	});

	it("returns null when no wallet exists at all", () => {
		expect(privyWalletAddress(user({}))).toBeNull();
	});

	it("returns null when the only wallet is foreign", () => {
		const u = user({ wallet: foreign(DEA), linkedAccounts: [] });
		expect(privyWalletAddress(u)).toBeNull();
	});
});
