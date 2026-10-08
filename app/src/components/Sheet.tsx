import { X } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef } from "react";

// One bottom-sheet dialog for both home actions. A <div role="dialog">, not
// the <dialog> element: dialog.showModal() traps focus in the top layer above
// our sticky header, while this needs to sit inside the 600px column and
// inherit its width. Escape closes, backdrop tap closes, focus lands on the
// close button on open, and the background stops scrolling underneath.
export function Sheet({
	title,
	onClose,
	children,
}: {
	title: string;
	onClose: () => void;
	children: ReactNode;
}) {
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		closeRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
			onClick={onClose}
			role="presentation"
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-label={title}
				onClick={(e) => e.stopPropagation()}
				className="max-h-[88dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[22px] border border-[var(--line)] bg-[var(--card)] p-5 pb-8 sm:rounded-[22px]"
			>
				<div className="flex items-center justify-between">
					<h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold text-[var(--ink)]">
						{title}
					</h2>
					<button
						ref={closeRef}
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="flex size-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
					>
						<X weight="bold" aria-hidden="true" className="size-4" />
					</button>
				</div>
				<div className="mt-4">{children}</div>
			</div>
		</div>
	);
}
