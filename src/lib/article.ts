import { type HTMLElement, parse } from "node-html-parser";

export interface ExtractedArticle {
	/** Raw HTML inside `<article> <main>`. */
	contentHtml: string;
	/** OG image, used as the thumbnail. */
	thumbnailUrl: string | null;
	/**
	 * Article text split on `<h2>` boundaries. Each chunk starts with its `<h2>`
	 * text; any text before the first `<h2>` becomes its own leading chunk.
	 * Chunks contain plain text only — no HTML markup.
	 */
	chunks: string[];
}

export function extractArticle(html: string): ExtractedArticle {
	const root = parse(html, {
		comment: false,
		blockTextElements: { script: false, noscript: false, style: false },
	});

	const thumbnailUrl =
		root
			.querySelector('meta[property="og:image"]')
			?.getAttribute("content")
			?.trim() || null;

	const main =
		root.querySelector("article main") ?? root.querySelector("main") ?? null;
	if (!main) {
		throw new Error("Could not find a <main> element inside <article>");
	}

	return {
		contentHtml: main.innerHTML,
		thumbnailUrl,
		chunks: chunkByHeading(main),
	};
}

function chunkByHeading(main: HTMLElement): string[] {
	const chunks: string[] = [];
	let heading: string | null = null;
	let buffer: string[] = [];

	const flush = () => {
		const body = normalizeWhitespace(buffer.join("\n\n"));
		const parts = [heading, body].filter(
			(part): part is string => !!part && part.length > 0,
		);
		if (parts.length > 0) chunks.push(parts.join("\n\n"));
		heading = null;
		buffer = [];
	};

	const walk = (node: HTMLElement) => {
		for (const child of node.childNodes) {
			// Text node.
			if (child.nodeType !== 1) {
				const text = normalizeWhitespace(child.text);
				if (text) buffer.push(text);
				continue;
			}

			const el = child as HTMLElement;
			const tag = el.rawTagName?.toLowerCase();

			if (tag === "h2") {
				flush();
				heading = normalizeWhitespace(el.text);
			} else if (el.querySelector("h2")) {
				// An <h2> is nested deeper — descend so its boundary is respected.
				walk(el);
			} else {
				const text = normalizeWhitespace(el.text);
				if (text) buffer.push(text);
			}
		}
	};

	walk(main);
	flush();
	return chunks;
}

function normalizeWhitespace(value: string): string {
	return value
		.replace(/\r\n?/g, "\n")
		.replace(/[\t\f\v ]+/g, " ")
		.replace(/ *\n */g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
