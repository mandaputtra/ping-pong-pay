import {
  createPasskeyWithPrfOutput,
  createSecp256k1SigningSession,
  getPasskeyPrfOutput,
  type Secp256k1SigningSession,
} from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import {
  createPublicClient,
  formatUnits,
  http,
  type Address,
} from "viem";
import { monadTestnet } from "viem/chains";

// AUSD on Monad testnet (docs.agora.finance contract deployments)
export const AUSD_TESTNET: Address = "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC";

const CREDENTIAL_KEY = "pingpong.credential";

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// Pure: PRF output -> secp256k1 private key (BIP-44 m/44'/60'/0'/0/index).
// Same derivation as https://docs.monad.xyz/guides/mera so the account is portable.
export function deriveEvmKey(prfOutput: Uint8Array, index = 0): Uint8Array {
  const seed = mnemonicToSeedSync(entropyToMnemonic(prfOutput, wordlist));
  const node = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/${index}`);
  if (node.privateKey === null) throw new Error("derivation produced no key");
  return node.privateKey;
}

let session: Secp256k1SigningSession | undefined;

// Single passkey prompt. New user (no stored credential) -> create; returning -> recover.
export async function connect(): Promise<Address> {
  const raw = localStorage.getItem(CREDENTIAL_KEY);
  let known;
  try {
    known = raw ? JSON.parse(raw) : undefined;
  } catch {
    localStorage.removeItem(CREDENTIAL_KEY); // corrupt entry -> treat as new user
  }

  const prfOutput: Uint8Array = known
    ? (await getPasskeyPrfOutput({ rpId: location.hostname, credential: known })).prfOutput
    : await createAndStore();

  session = createSecp256k1SigningSession({ privateKey: deriveEvmKey(prfOutput) });
  return toViemAccount(session).address;
}

async function createAndStore(): Promise<Uint8Array> {
  const created = await createPasskeyWithPrfOutput({
    rp: { id: location.hostname, name: "Ping Pong Pay" },
    user: { name: "ping-pong-pay", displayName: "Ping Pong Pay" },
  });
  localStorage.setItem(
    CREDENTIAL_KEY,
    JSON.stringify({ credentialId: created.credentialId, transports: created.transports }),
  );
  return created.prfOutput;
}

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
    publicClient.readContract({ address: AUSD_TESTNET, abi: ERC20_BALANCE_ABI, functionName: "balanceOf", args: [address] }),
    publicClient.readContract({ address: AUSD_TESTNET, abi: ERC20_BALANCE_ABI, functionName: "decimals" }),
  ]);
  return formatUnits(raw, decimals);
}

export function disconnect(): void {
  session?.end(); // zeroes the key
  session = undefined;
}
