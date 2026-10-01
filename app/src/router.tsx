import {
	createRouter as createTanStackRouter,
	Link,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = getContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultNotFoundComponent: NotFoundFallback,
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}
function NotFoundFallback() {
	return (
		<main className="ppp">
			<h1>That page doesn&apos;t exist</h1>
			<p className="muted">The link may be old or mistyped.</p>
			<Link to="/">Back to Ping Pong Pay</Link>
		</main>
	);
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
