import { createFileRoute } from "@tanstack/react-router";
import { PingPongPay } from "../components/PingPongPay";

export const Route = createFileRoute("/")({
	component: function Home() {
		return <PingPongPay />;
	},
});
