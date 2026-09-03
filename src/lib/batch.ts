/** Split `items` into consecutive chunks of at most `size`. */
export function batches<T>(items: readonly T[], size: number): T[][] {
	if (!Number.isInteger(size) || size < 1) {
		throw new Error(`batch size must be a positive integer, got ${size}`);
	}
	const result: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		result.push(items.slice(i, i + size));
	}
	return result;
}
