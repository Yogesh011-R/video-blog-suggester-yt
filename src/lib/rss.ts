import { XMLParser } from "fast-xml-parser";

export interface FeedArticle {
	title: string;
	url: string;
	description: string;
	/** ISO 8601 string — step boundaries only carry serializable values. */
	publishDate: string;
}

interface RawItem {
	title?: string;
	link?: string;
	description?: string;
	pubDate?: string;
}

const parser = new XMLParser({ trimValues: true });

/**
 * Parse an RSS 2.0 feed into article descriptors, de-duplicated by URL
 * (later items win). Items without a `<link>` are skipped; an unparseable or
 * missing `<pubDate>` falls back to the current time.
 */
export function parseFeed(xml: string): FeedArticle[] {
	const parsed = parser.parse(xml) as {
		rss?: { channel?: { item?: RawItem | RawItem[] } };
	};

	const raw = parsed.rss?.channel?.item;
	const items = Array.isArray(raw) ? raw : raw ? [raw] : [];

	const byUrl = new Map<string, FeedArticle>();
	for (const item of items) {
		const url = String(item.link ?? "").trim();
		if (!url) continue;

		const parsedDate = item.pubDate ? new Date(item.pubDate) : new Date();
		const publishDate = Number.isNaN(parsedDate.getTime())
			? new Date().toISOString()
			: parsedDate.toISOString();

		byUrl.set(url, {
			title: String(item.title ?? "").trim(),
			url,
			description: String(item.description ?? "").trim(),
			publishDate,
		});
	}

	return [...byUrl.values()];
}

/** Feed articles whose URL is not among `existingUrls`, preserving feed order. */
export function diffFeed(
	feed: readonly FeedArticle[],
	existingUrls: Iterable<string>,
): FeedArticle[] {
	const seen = new Set(existingUrls);
	return feed.filter((article) => !seen.has(article.url));
}
