import {
	type Account,
	type Address,
	decodeAbiParameters,
	encodeAbiParameters,
	type Hex,
	parseAbiParameters,
	recoverTypedDataAddress,
	type WalletClient,
} from "viem";

// A payment request is an offchain signed intent. Nothing is stored onchain and no
// contract custodies funds: the link carries the intent, the payer verifies the
// requester's signature, then pays the verified recipient a direct USDC transfer.
//
// Everything that decides where money goes - recipient, token, amount, nonce,
// expiry - lives inside the typed data, so editing the URL cannot change the
// payment. The URL is a transport, not a source of truth.

export const REQUEST_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days

const domain = {
	name: "Ping Pong Pay",
	version: "1",
	chainId: 10143, // Monad testnet
} as const;

export type PaymentRequest = {
	recipient: Address;
	token: Address;
	amount: string; // base units, decimal string
	nonce: string; // unix seconds
	expiry: string; // unix seconds
	description: string;
	// Display-only, like description: it travels unsigned in the URL and is shown
	// to the payer as the requester's name. It is not a payment term.
	requesterName: string;
};

const requestTypes = {
	Request: [
		{ name: "recipient", type: "address" },
		{ name: "token", type: "address" },
		{ name: "amount", type: "uint256" },
		{ name: "nonce", type: "uint256" },
		{ name: "expiry", type: "uint256" },
	],
} as const;

const linkParams = parseAbiParameters(
	"address recipient, address token, uint256 amount, uint256 nonce, uint256 expiry, bytes signature",
);

// The description is deliberately NOT part of the typed data: it is a note to the
// payer, not a term of the payment, so a typo in prose must not force a re-sign.
// It rides along in the URL unsigned, and the pay screen labels it as the
// requester's note rather than a guaranteed term.
export function buildRequest(
	recipient: Address,
	token: Address,
	amount: string,
	description: string,
	requesterName = "",
	now = Math.floor(Date.now() / 1000),
): PaymentRequest {
	return {
		recipient,
		token,
		amount,
		nonce: String(now),
		expiry: String(now + REQUEST_EXPIRY_SECONDS),
		description,
		requesterName,
	};
}

export async function signRequest(
	signer: WalletClient,
	account: Address | Account,
	r: PaymentRequest,
): Promise<Hex> {
	return signer.signTypedData({
		account,
		domain,
		types: requestTypes,
		primaryType: "Request",
		message: {
			recipient: r.recipient,
			token: r.token,
			amount: BigInt(r.amount),
			nonce: BigInt(r.nonce),
			expiry: BigInt(r.expiry),
		},
	});
}

export async function verifyRequest(
	r: PaymentRequest,
	signature: Hex,
): Promise<boolean> {
	try {
		const signer = await recoverTypedDataAddress({
			domain,
			types: requestTypes,
			primaryType: "Request",
			message: {
				recipient: r.recipient,
				token: r.token,
				amount: BigInt(r.amount),
				nonce: BigInt(r.nonce),
				expiry: BigInt(r.expiry),
			},
			signature,
		});
		return signer.toLowerCase() === r.recipient.toLowerCase();
	} catch {
		return false;
	}
}

// --- URL transport -------------------------------------------------------
// One self-describing blob: the signed request fields plus the signature. The pay
// screen decodes it and verifies the signature over the decoded fields, so a
// hand-edited link fails verification instead of redirecting the payment.

export function encodeLink(
	r: PaymentRequest,
	signature: Hex,
	origin: string,
): string {
	const encoded = encodeAbiParameters(linkParams, [
		r.recipient,
		r.token,
		BigInt(r.amount),
		BigInt(r.nonce),
		BigInt(r.expiry),
		signature,
	]);
	// The description and the requester's name are display-only, not payment
	// terms, so they travel unsigned as query params. verifyRequest ignores both;
	// the pay screen shows them as the requester's own words. The amount,
	// recipient and expiry are still verified cryptographically.
	const params = new URLSearchParams();
	if (r.description) params.set("d", r.description);
	if (r.requesterName) params.set("from", r.requesterName);
	const query = params.toString();
	return `${origin}/pay/${encoded.slice(2)}${query ? `?${query}` : ""}`;
}

export type DecodedRequest = PaymentRequest & { signature: Hex };

// Reads the display-only fields off the route's parsed search object. Kept
// separate from decodeLink so nothing unsigned can ever reach verification.
export function displayFieldsFrom(search: { d?: string; from?: string }): {
	description: string;
	requesterName: string;
} {
	return {
		description: search.d ?? "",
		requesterName: search.from ?? "",
	};
}

export function decodeLink(slug: string): DecodedRequest | null {
	try {
		const [recipient, token, amount, nonce, expiry, signature] =
			decodeAbiParameters(linkParams, `0x${slug}`);
		return {
			recipient: recipient as Address,
			token: token as Address,
			amount: amount.toString(),
			nonce: nonce.toString(),
			expiry: expiry.toString(),
			description: "",
			requesterName: "",
			signature: signature as Hex,
		};
	} catch {
		return null;
	}
}
