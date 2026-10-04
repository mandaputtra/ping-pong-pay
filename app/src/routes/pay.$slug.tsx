import { createFileRoute } from "@tanstack/react-router";
import { PayRequest } from "../components/PayRequest";

export const Route = createFileRoute("/pay/$slug")({
	component: PayRoute,
});

function PayRoute() {
	const { slug } = Route.useParams();
	// `d` is the freelancer's unsigned note. It is display-only: the payment terms
	// come from the signed blob and nothing else.
	const description = new URLSearchParams(Route.useSearch()).get("d") ?? "";
	return <PayRequest slug={slug} description={description} />;
}
