import { describe, expect, test } from "bun:test";
import { batches } from "./batch.ts";

describe("batches", () => {
	test("splits into consecutive chunks of the given size", () => {
		expect(batches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
	});

	test("returns a single full batch when size matches length", () => {
		expect(batches([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
	});

	test("returns one batch when size exceeds length", () => {
		expect(batches([1, 2], 10)).toEqual([[1, 2]]);
	});

	test("returns an empty array for empty input", () => {
		expect(batches([], 10)).toEqual([]);
	});

	test("preserves order across batches", () => {
		const items = Array.from({ length: 25 }, (_, i) => i);
		const result = batches(items, 10);
		expect(result.map((b) => b.length)).toEqual([10, 10, 5]);
		expect(result.flat()).toEqual(items);
	});

	test("does not mutate the input array", () => {
		const items = [1, 2, 3];
		batches(items, 2);
		expect(items).toEqual([1, 2, 3]);
	});

	test.each([0, -1, 1.5, Number.NaN])("rejects invalid size %p", (size) => {
		expect(() => batches([1, 2, 3], size)).toThrow(/positive integer/);
	});
});
