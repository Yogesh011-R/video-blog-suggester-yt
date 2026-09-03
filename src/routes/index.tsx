import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<div className="min-h-svh flex items-center justify-center p-8">
			<div className="w-full max-w-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-8 flex flex-col items-center gap-6">
				<h1 className="text-xl font-semibold">Video Blog Suggester</h1>

				{isPending ? (
					<div className="h-24 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-900" />
				) : session?.user ? (
					<>
						{session.user.image ? (
							<img
								src={session.user.image}
								alt={session.user.name ?? "Profile"}
								className="h-20 w-20 rounded-full"
							/>
						) : (
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-2xl font-medium text-neutral-600 dark:text-neutral-300">
								{session.user.name?.charAt(0).toUpperCase() ?? "U"}
							</div>
						)}
						<div className="text-center">
							<p className="font-medium">{session.user.name}</p>
							<p className="text-sm text-neutral-500">{session.user.email}</p>
						</div>
						<button
							type="button"
							onClick={() => {
								void authClient.signOut();
							}}
							className="w-full h-10 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
						>
							Sign out
						</button>
					</>
				) : (
					<>
						<p className="text-sm text-neutral-500 text-center">
							Sign in to continue.
						</p>
						<button
							type="button"
							onClick={() => {
								void authClient.signIn.social({
									provider: "github",
									callbackURL: "/",
								});
							}}
							className="w-full h-10 rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition-opacity"
						>
							Continue with GitHub
						</button>
					</>
				)}
			</div>
		</div>
	);
}
