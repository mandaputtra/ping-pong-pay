import { useState } from "react";
import { connect, disconnect, getBalance } from "./wallet";
import { friendlyError, topUp } from "./topup";
import { sessionAccount } from "./wallet";
import type { Address } from "viem";

function dollars(raw: string): string {
  const [whole, frac = ""] = raw.split(".");
  return `$${Number(whole).toLocaleString("en-US")}.${(frac + "00").slice(0, 2)}`;
}

export function App() {
  const [address, setAddress] = useState<Address | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setError("");
    try {
      const next = await connect();
      setBalance(await getBalance(next));
      setAddress(next);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function addMoney() {
    setError("");
    setBusy(true);
    try {
      const account = sessionAccount()!;
      await topUp(account.address);
      setBalance(await getBalance(account.address));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (address === null) {
    return (
      <main>
        <h1>Ping Pong Pay</h1>
        <p className="muted">Easy dollar payments. No passwords, no crypto fuss.</p>
        <button onClick={signIn}>Get started</button>
        {error && <p role="alert" className="error">{error}</p>}
      </main>
    );
  }

  return (
    <main>
      <h1>Ping Pong Pay</h1>
      <p className="muted">{address.slice(0, 6)}…{address.slice(-4)}</p>
      <p className="balance">{dollars(balance)}</p>
      <div className="row">
        <button onClick={addMoney} disabled={busy}>
          {busy ? "Adding money…" : "Add money"}
        </button>
        <button className="ghost" onClick={() => { disconnect(); setAddress(null); }}>
          Sign out
        </button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
    </main>
  );
}
