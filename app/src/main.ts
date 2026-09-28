import { connect, disconnect, getBalance } from "./wallet";

const signedOut = document.getElementById("signed-out")!;
const signedIn = document.getElementById("signed-in")!;
const addressEl = document.getElementById("address")!;
const balanceEl = document.getElementById("balance")!;
const errorEl = document.getElementById("error")!;

function formatDollars(raw: string): string {
  const [whole, frac = ""] = raw.split(".");
  return `$${Number(whole).toLocaleString("en-US")}.${(frac + "00").slice(0, 2)}`;
}

document.getElementById("signup")!.addEventListener("click", async () => {
  errorEl.textContent = "";
  try {
    const address = await connect();
    const balance = await getBalance(address); // resolve before flipping UI
    addressEl.textContent = `${address.slice(0, 6)}…${address.slice(-4)}`;
    balanceEl.textContent = formatDollars(balance);
    signedOut.hidden = true;
    signedIn.hidden = false;
  } catch (err) {
    errorEl.textContent = err instanceof Error ? err.message : "Something went wrong — try again.";
  }
});

document.getElementById("signout")!.addEventListener("click", () => {
  disconnect();
  signedIn.hidden = true;
  signedOut.hidden = false;
});
