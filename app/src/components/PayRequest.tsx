import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { usdFromBaseUnits } from "../lib/amount";
import type { DecodedRequest } from "../lib/request";
import { decodeLink, verifyRequest } from "../lib/request";

// The link is untrusted input until the signature checks out. Nothing is shown as
// payable, and no signing prompt is reachable, before verifyRequest says the
// recipient signed these exact terms.
export function PayRequest({
	slug,
	description,
}: {
	slug: string;
	description: string;
}) {
	const { ready, authenticated, user } = usePrivy();
	const { login } = useLogin();
	const [state, setState] = useState<
		| { kind: "checking" }
		| { kind: "invalid"; reason: string }
		| { kind: "expired" }
		| { kind: "ready"; request: DecodedRequest }
	>({ kind: "checking" });

	useEffect(() => {
		let cancelled = false;
		const decoded = decodeLink(slug);
		if (!decoded) {
			setState({
				kind: "invalid",
				reason: "This link isn't a payment request.",
			});
			return;
		}
		verifyRequest(decoded, decoded.signature).then((valid) => {
			if (cancelled) return;
			if (!valid) {
				setState({
					kind: "invalid",
					reason: "This request doesn't match the freelancer's signature.",
				});
				return;
			}
			if (Number(decoded.expiry) * 1000 < Date.now()) {
				setState({ kind: "expired" });
				return;
			}
			setState({ kind: "ready", request: decoded });
		});
		return () => {
			cancelled = true;
		};
	}, [slug]);

	if (state.kind === "checking" || !ready) {
		return (
			<main className="ppp">
				<h1>Checking request…</h1>
			</main>
		);
	}

	if (state.kind === "invalid" || state.kind === "expired") {
		return (
			<main className="ppp">
				<h1>
					{state.kind === "expired" ? "This link has expired" : "Invalid link"}
				</h1>
				<p className="muted">
					{state.kind === "expired"
						? "Ask your client for a fresh link."
						: state.reason}
				</p>
			</main>
		);
	}

	const { request } = state;

	return (
		<main className="ppp">
			<h1>Payment request</h1>
			<p className="balance">{usdFromBaseUnits(request.amount)}</p>
			{description && <p className="muted">{`For: ${description}`}</p>}
			<p className="muted">{`To ${request.recipient}`}</p>
			<p className="muted">USDC on Monad</p>
			{authenticated && user ? (
				<p className="muted">{`Paying as ${user.email?.address ?? "your wallet"}`}</p>
			) : (
				<button type="button" onClick={login}>
					Get started
				</button>
			)}
		</main>
	);
}
