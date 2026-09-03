import { embed } from "@tanstack/ai";
import { batches } from "#/lib/batch.ts";
import { getEmbeddingModel } from "#/lib/embedding/get-embedding-model.ts";

/** Vector width stored in the `chunks.embedding` column. */
export const EMBEDDING_DIMENSIONS = 1024;

/** Chunks per embed request. Keeps payloads well under provider batch limits. */
const DEFAULT_BATCH_SIZE = 96;

/**
 * Embed an ordered list of chunk texts.
 *
 * Chunks are sent to the configured provider (see {@link getEmbeddingModel}) in
 * batches, and the returned vectors line up 1:1 with `texts` in the same order.
 * An empty input yields an empty array without calling the provider.
 *
 * OpenAI is asked to truncate to {@link EMBEDDING_DIMENSIONS}; Ollama rejects a
 * dimensions request, but `qwen3-embedding:0.6b` is natively that width.
 */
export async function embedChunks(
	texts: readonly string[],
	batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<number[][]> {
	if (texts.length === 0) return [];

	const adapter = getEmbeddingModel();
	const dimensions =
		adapter.name === "openai" ? EMBEDDING_DIMENSIONS : undefined;

	const vectors: number[][] = [];

	for (const batch of batches(texts, batchSize)) {
		const result = await embed({ adapter, input: [...batch], dimensions });

		const ordered = [...result.embeddings].sort((a, b) => a.index - b.index);
		for (const embedding of ordered) vectors.push(embedding.vector);
	}

	return vectors;
}
