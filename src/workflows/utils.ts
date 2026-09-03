import { batches } from "#/lib/batch.ts";

export interface BatchExecOptions {
	/** Items processed in parallel per batch. Default 10. */
	batchSize?: number;
	/** Pause between batches, in milliseconds. Default 0 (no pause). */
	delayMs?: number;
}

export interface BatchExecResult<T> {
	total: number;
	succeeded: number;
	failed: number;
	/** The items whose `fn` call rejected, paired with the rejection reason. */
	errors: { item: T; reason: unknown }[];
}

/**
 * Run `fn` over every item in `items`, `batchSize` at a time, settling each
 * batch before the next one starts. Rejections are collected rather than
 * thrown, so a single failing item never aborts the run.
 */
export async function batchExec<T>(
	items: readonly T[],
	fn: (item: T) => Promise<unknown>,
	{ batchSize = 10, delayMs = 0 }: BatchExecOptions = {},
): Promise<BatchExecResult<T>> {
	const groups = batches(items, batchSize);
	const errors: { item: T; reason: unknown }[] = [];
	let succeeded = 0;

	for (let i = 0; i < groups.length; i++) {
		const batch = groups[i];
		const results = await Promise.allSettled(
			batch.map((item) => Promise.resolve().then(() => fn(item))),
		);

		results.forEach((result, j) => {
			if (result.status === "fulfilled") {
				succeeded++;
			} else {
				errors.push({ item: batch[j], reason: result.reason });
			}
		});

		if (delayMs > 0 && i < groups.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	return { total: items.length, succeeded, failed: errors.length, errors };
}
