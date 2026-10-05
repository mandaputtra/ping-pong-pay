import { createFileRoute } from "@tanstack/react-router";
import { PayRequest } from "../components/PayRequest";
import { displayFieldsFrom } from "../lib/request";

export const Route = createFileRoute("/pay/$slug")({
	component: PayRoute,
});

function PayRoute() {
	const { slug } = Route.useParams();
	// `d` is the requester's note and `from` is their name. Both are unsigned and
	// display-only: every payment term — recipient, token, amount, nonce, expiry —
	// comes from the signed blob and is verified before anything is payable.
	const { description, requesterName } = displayFieldsFrom(Route.useSearch());
	return (
		<PayRequest
			slug={slug}
			description={description}
			requesterName={requesterName}
		/>
	);
}
