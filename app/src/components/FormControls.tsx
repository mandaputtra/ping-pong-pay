import type { ReactNode } from "react";

// Shared form atoms for the two home sheets. Editorial Luxury on the existing
// reference theme: warm paper, deep-teal action, serif display already in the
// page shell. One island-style primary button (teal pill, trailing icon disc)
// and one field style, so Request and Cash-out read as the same product.

// The phosphor icon is passed as a node so each form keeps its own metaphor
// without this file importing an icon set for it.
export function FormButton({
	onClick,
	disabled,
	busy,
	children,
	icon,
}: {
	onClick?: () => void | Promise<void>;
	disabled?: boolean;
	busy?: boolean;
	children: ReactNode;
	icon: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="group flex min-h-[56px] w-full items-center justify-between gap-3 rounded-full bg-[var(--teal)] py-2 pr-2 pl-6 text-[17px] font-semibold text-white shadow-[0_14px_30px_rgb(47_92_85/0.32),inset_0_1px_1px_rgb(255_255_255/0.22)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_18px_38px_rgb(47_92_85/0.4),inset_0_1px_1px_rgb(255_255_255/0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
		>
			<span>{busy ? "Working…" : children}</span>
			<span
				aria-hidden="true"
				className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-active:scale-95"
			>
				{icon}
			</span>
		</button>
	);
}

export function FormField({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<label className="block">
			<span className="mb-1.5 block text-[13px] font-semibold text-[var(--ink-soft)]">
				{label}
			</span>
			{children}
		</label>
	);
}

export function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			{...props}
			className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-[16px] text-[var(--ink)] shadow-[inset_0_1px_2px_rgb(36_51_61/0.05)] transition-colors duration-200 outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--teal)]"
		/>
	);
}
