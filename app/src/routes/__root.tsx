import { PrivyProvider } from "@privy-io/react-auth";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { monadTestnet } from "viem/chains";
import Footer from "../components/Footer";
import Header from "../components/Header";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

// Light-only. The old script resolved light/dark/auto from storage and the OS;
// now it pins light and clears any stored preference left behind.
const THEME_INIT_SCRIPT = `(function(){try{window.localStorage.removeItem('theme');var root=document.documentElement;root.classList.remove('light','dark');root.classList.add('light');root.removeAttribute('data-theme');root.style.colorScheme='light';}catch(e){}})();`;

// Socials, email, and passkey must also be enabled in the Privy dashboard;
// this list only subsets what the dashboard allows. An embedded wallet is
// created for users who arrive without one.
const LOGIN_METHODS = [
	"google",
	"apple",
	"github",
	"email",
	"passkey",
] as const;
export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Ping Pong Pay",
			},
			{
				name: "description",
				content:
					"Easy dollar payments for freelancers. Send a link, get paid in seconds, no crypto fuss.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: static literal from the TanStack scaffold, no interpolation */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
				<PrivyProvider
					appId={import.meta.env.VITE_PRIVY_APP_ID}
					config={{
						loginMethods: [...LOGIN_METHODS],
						defaultChain: monadTestnet,
						supportedChains: [monadTestnet],
						embeddedWallets: {
							ethereum: { createOnLogin: "users-without-wallets" },
						},
					}}
				>
					<a
						href="#main"
						className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-[var(--surface-card)] focus:px-3 focus:py-2 focus:text-sm"
					>
						Skip to content
					</a>
					<div className="pay-column">
						<Header />
						{children}
						<Footer />
					</div>
				</PrivyProvider>
				{/* Devtools ship in the production bundle unless gated, and a
				    floating debug panel in a hackathon submission reads as an
				    unfinished build. */}
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
