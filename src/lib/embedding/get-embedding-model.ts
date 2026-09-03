import { createOllamaEmbedding } from "@tanstack/ai-ollama";
import { createOpenaiEmbedding } from "@tanstack/ai-openai";
import { env } from "@/env";


const QWEN_MODEL = 'qwen3-embedding:0.6b'
const OPENAI_MODEL= 'text-embedding-3-small'

/**
 * Build the embedding adapter for the configured provider.
 *
 * - `qwen`: a local Qwen3 embedding model served through an Ollama-compatible
 *   endpoint at `LOCAL_EMBEDDING_BASE_URL`.
 * - `openai`: OpenAI's `text-embedding-3-small`, using `OPENAI_API_KEY` from
 *   the environment.
 *
 * Pass the result straight to `embed({ adapter, input })` from `@tanstack/ai`.
 */
export const getEmbeddingModel = () => {
	if (env.EMBEDDING_PROVDIER === "qwen") {
		return createOllamaEmbedding(QWEN_MODEL, env.LOCAL_EMBEDDING_BASE_URL);
	}

	if (!env.OPENAI_API_KEY) {
		throw new Error(
			"OPENAI_API_KEY is required when EMBEDDING_PROVDIER is \"openai\".",
		);
	}

	return createOpenaiEmbedding(OPENAI_MODEL, env.OPENAI_API_KEY);
};
