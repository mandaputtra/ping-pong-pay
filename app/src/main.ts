import { connect, disconnect, getBalance, sessionAccount } from "./wallet";
import { friendlyError, topUp } from "./topup";
import type { Address } from "viem";

const signedOut = document.getElementById("signed-out")!;
const signedIn = document.getElementById("signed-in")!;
const addressEl = document.getElementById("address")!;
const balanceEl = document.getElementById("balance")!;
const errorEl = document.getElementById("error")!;
const addMoneyBtn = document.getElementById("add-money") as HTMLButtonElement;

async function refreshBalance(address: Address): Promise<void> {
  const [whole, frac = ""] = (await getBalance(address)).split(".");
  balanceEl.textContent = `$${Number(whole).toLocaleString("en-US")}.${(frac + "00").slice(0, 2)}`;
}

document.getElementById("signup")!.addEventListener("click", async () => {
  errorEl.textContent = "";
  try {
    const address = await connect();
    await refreshBalance(address); // resolve before flipping UI
    addressEl.textContent = `${address.slice(0, 6)}…${address.slice(-4)}`;
    signedOut.hidden = true;
    signedIn.hidden = false;
  } catch (err) {
    errorEl.textContent = friendlyError(err);
  }
});
addMoneyBtn.addEventListener("click", async () => {
  errorEl.textContent = "";
  addMoneyBtn.disabled = true;
  addMoneyBtn.textContent = "Adding money…";
  try {
    const account = sessionAccount()!;
    await topUp(account.address);
    await refreshBalance(account.address);
  } catch (err) {
    errorEl.textContent = friendlyError(err);
  } finally {
    addMoneyBtn.disabled = false;
    addMoneyBtn.textContent = "Add money";
  }
});

document.getElementById("signout")!.addEventListener("click", () => {
  disconnect();
  signedIn.hidden = true;
  signedOut.hidden = false;
});
