// Seeds demo history for a known account. Run against local compose or Fly:
//   DATABASE_URL=postgres://ppp:ppp@localhost:5434/pingpongpay \
//     node --experimental-strip-types db/seed.ts <wallet-address>
//
// The rows reference the seeder's own address as both requester and recipient,
// so the seeded history shows up on that account's homepage immediately. Paid
// flags are mixed so both states render.

import { ulid } from "ulid";
import { isAddress } from "viem";
import { createRequest, upsertUser, markRequestPaid } from "../src/lib/db.ts";

const EMAIL = "mandaputra8@gmail.com";
const SHORT_NAME = "Manda";
const TOKEN = "0x534b2f3A21130d7a60830c2Df862319e593943A3";

const SEED_ROWS: Array<{
	description: string;
	requesterName: string;
	amount: string;
	daysAgo: number;
	paid: boolean;
}> = [
	{
		description: "Logo design",
		requesterName: "Manda",
		amount: "50000000",
		daysAgo: 1,
		paid: true,
	},
	{
		description: "Brand refresh",
		requesterName: "Manda",
		amount: "2500000",
		daysAgo: 2,
		paid: true,
	},
	{
		description: "Landing page copy",
		requesterName: "Manda",
		amount: "120000000",
		daysAgo: 4,
		paid: false,
	},
	{
		description: "Invoice March",
		requesterName: "Manda",
		amount: "75000000",
		daysAgo: 9,
		paid: true,
	},
	{
		description: "Quick consult",
		requesterName: "Manda",
		amount: "10000000",
		daysAgo: 12,
		paid: false,
	},
];

const address = process.argv[2] ?? "";
if (!isAddress(address)) {
	console.error("usage: seed.ts <wallet-address>");
	process.exit(1);
}
if (!process.env.DATABASE_URL) {
	console.error("DATABASE_URL is not set");
	process.exit(1);
}

await upsertUser(address, EMAIL, SHORT_NAME);

const now = Math.floor(Date.now() / 1000);
for (const seed of SEED_ROWS) {
	const nonce = String(now - seed.daysAgo * 86400);
	const row = await createRequest({
		id: ulid(now - seed.daysAgo * 86400_000 - seed.amount.length),
		requesterAddress: address,
		recipient: address,
		token: TOKEN,
		amount: seed.amount,
		nonce,
		expiry: String(now + 7 * 86400),
		signature: `0x${"ab".repeat(32)}`,
		description: seed.description,
		requesterName: seed.requesterName,
	});
	if (seed.paid) {
		await markRequestPaid(row.id, `0x${"cd".repeat(32)}`);
	}
	console.log(`${seed.paid ? "paid  " : "unpaid"} ${row.id} ${seed.description}`);
}
console.log(`seeded ${SEED_ROWS.length} rows for ${EMAIL}`);
