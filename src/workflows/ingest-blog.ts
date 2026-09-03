import { inArray } from "drizzle-orm";
import { FatalError } from "workflow";
import { db } from "#/db/index.ts";
import { chunks as chunksTable, content } from "#/db/schema/index.ts";
import { extractArticle } from "#/lib/article.ts";
import { diffFeed, type FeedArticle, parseFeed } from "#/lib/rss.ts";
import { batchExec } from "#/workflows/utils.ts";

const RSS_URL = "https://blog.webdevsimplified.com/rss.xml";

/** Articles fetched per parallel batch, to avoid hammering the blog. */
const BATCH_SIZE = 10;

/**
 * Two-step ingest:
 *  1. Diff the RSS feed against the `content` table to find new articles.
 *  2. For each new article (10 at a time), fetch, extract, chunk, and store it.
 *
 * Embeddings are intentionally left for a later task.
 */
export async function ingestBlog() {
	"use workflow";

	const missing = await getMissingArticles();

	const { succeeded, failed } = await batchExec(missing, ingestArticle, {
		batchSize: BATCH_SIZE,
	});

	return { newArticles: missing.length, succeeded, failed };
}

/** Step 1: list feed articles that are not yet in the database. */
async function getMissingArticles(): Promise<FeedArticle[]> {
	"use step";

	const res = await fetch(RSS_URL, {
		headers: { accept: "application/rss+xml, application/xml, text/xml" },
	});
	if (!res.ok) {
		throw new Error(
			`Failed to fetch RSS feed: ${res.status} ${res.statusText}`,
		);
	}

	const feed = parseFeed(await res.text());
	if (feed.length === 0) return [];

	const existing = await db
		.select({ url: content.url })
		.from(content)
		.where(
			inArray(
				content.url,
				feed.map((article) => article.url),
			),
		);

	return diffFeed(
		feed,
		existing.map((row) => row.url),
	);
}

/** Step 2: fetch one article, extract its main content, chunk it, and store it. */
async function ingestArticle(article: FeedArticle) {
	"use step";

	const res = await fetch(article.url, { headers: { accept: "text/html" } });
	if (!res.ok) {
		throw new Error(
			`Failed to fetch article ${article.url}: ${res.status} ${res.statusText}`,
		);
	}

	const { contentHtml, thumbnailUrl, chunks } = extractArticle(
		await res.text(),
	);

	// The schema requires a thumbnail; a missing og:image is a page problem that
	// retrying won't fix, so fail the step permanently.
	if (!thumbnailUrl) {
		throw new FatalError(`No og:image found for ${article.url}`);
	}

	await db.transaction(async (tx) => {
		const [row] = await tx
			.insert(content)
			.values({
				title: article.title,
				description: article.description,
				publishDate: new Date(article.publishDate),
				url: article.url,
				thumbnailUrl,
				type: "article",
				content: contentHtml,
			})
			.onConflictDoNothing({ target: content.url })
			.returning({ id: content.id });

		// Another run stored this URL after step 1 ran — nothing to do.
		if (!row) return;

		if (chunks.length > 0) {
			await tx
				.insert(chunksTable)
				.values(chunks.map((text) => ({ contentId: row.id, text })));
		}
	});

	return { url: article.url, chunks: chunks.length };
}
