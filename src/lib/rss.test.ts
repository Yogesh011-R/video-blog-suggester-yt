import { describe, expect, test } from "bun:test";
import { diffFeed, type FeedArticle, parseFeed } from "./rss.ts";

const item = (opts: {
	title?: string;
	link?: string;
	description?: string;
	pubDate?: string;
}) => `
	<item>
		${opts.title === undefined ? "" : `<title>${opts.title}</title>`}
		${opts.link === undefined ? "" : `<link>${opts.link}</link>`}
		${
			opts.description === undefined
				? ""
				: `<description>${opts.description}</description>`
		}
		${opts.pubDate === undefined ? "" : `<pubDate>${opts.pubDate}</pubDate>`}
	</item>`;

const feed = (...items: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
	<title>Web Dev Simplified Blog</title>
	<link>https://blog.webdevsimplified.com/</link>
	${items.join("\n")}
</channel></rss>`;

describe("parseFeed", () => {
	test("parses a well-formed feed into article descriptors", () => {
		const xml = feed(
			item({
				title: "How To Use ES6 Modules With Node.js",
				link: "https://blog.webdevsimplified.com/2019-09/es6-modules-in-nodejs/",
				description: "Two simple ways to use ES6 modules with Node.js.",
				pubDate: "Mon, 30 Sep 2019 00:00:00 GMT",
			}),
		);

		expect(parseFeed(xml)).toEqual([
			{
				title: "How To Use ES6 Modules With Node.js",
				url: "https://blog.webdevsimplified.com/2019-09/es6-modules-in-nodejs/",
				description: "Two simple ways to use ES6 modules with Node.js.",
				publishDate: "2019-09-30T00:00:00.000Z",
			},
		]);
	});

	test("returns every item for a multi-item feed, in order", () => {
		const xml = feed(
			item({ title: "One", link: "https://example.com/1/" }),
			item({ title: "Two", link: "https://example.com/2/" }),
			item({ title: "Three", link: "https://example.com/3/" }),
		);
		expect(parseFeed(xml).map((a) => a.url)).toEqual([
			"https://example.com/1/",
			"https://example.com/2/",
			"https://example.com/3/",
		]);
	});

	test("handles a feed with a single <item> (not coerced to an array by the parser)", () => {
		const xml = feed(
			item({ title: "Only", link: "https://example.com/only/" }),
		);
		const result = parseFeed(xml);
		expect(result).toHaveLength(1);
		expect(result[0].url).toBe("https://example.com/only/");
	});

	test("decodes XML entities in titles and descriptions", () => {
		const xml = feed(
			item({
				title: "Why You Shouldn&apos;t Use Class Selectors &amp; IDs",
				link: "https://example.com/x/",
				description: "A &lt;div&gt; breakdown",
			}),
		);
		const [article] = parseFeed(xml);
		expect(article.title).toBe("Why You Shouldn't Use Class Selectors & IDs");
		expect(article.description).toBe("A <div> breakdown");
	});

	test("de-duplicates by URL, keeping the last occurrence", () => {
		const xml = feed(
			item({ title: "Old", link: "https://example.com/dup/" }),
			item({ title: "New", link: "https://example.com/dup/" }),
		);
		const result = parseFeed(xml);
		expect(result).toHaveLength(1);
		expect(result[0].title).toBe("New");
	});

	test("skips items without a <link>", () => {
		const xml = feed(
			item({ title: "No link" }),
			item({ title: "Has link", link: "https://example.com/ok/" }),
		);
		expect(parseFeed(xml).map((a) => a.url)).toEqual([
			"https://example.com/ok/",
		]);
	});

	test("defaults missing title and description to empty strings", () => {
		const xml = feed(item({ link: "https://example.com/bare/" }));
		const [article] = parseFeed(xml);
		expect(article.title).toBe("");
		expect(article.description).toBe("");
	});

	test("falls back to a valid ISO date when pubDate is missing or unparseable", () => {
		const xml = feed(
			item({ link: "https://example.com/no-date/" }),
			item({ link: "https://example.com/bad-date/", pubDate: "not a date" }),
		);
		for (const article of parseFeed(xml)) {
			expect(Number.isNaN(Date.parse(article.publishDate))).toBe(false);
		}
	});

	test("returns an empty array for a feed with no items", () => {
		expect(parseFeed(feed())).toEqual([]);
	});

	test("returns an empty array for input that is not an RSS document", () => {
		expect(parseFeed("<html><body>nope</body></html>")).toEqual([]);
	});
});

describe("diffFeed", () => {
	const articles: FeedArticle[] = [
		{
			title: "A",
			url: "https://example.com/a/",
			description: "",
			publishDate: "",
		},
		{
			title: "B",
			url: "https://example.com/b/",
			description: "",
			publishDate: "",
		},
		{
			title: "C",
			url: "https://example.com/c/",
			description: "",
			publishDate: "",
		},
	];

	test("returns only articles whose URL is not already known", () => {
		const result = diffFeed(articles, ["https://example.com/b/"]);
		expect(result.map((a) => a.url)).toEqual([
			"https://example.com/a/",
			"https://example.com/c/",
		]);
	});

	test("returns everything when nothing is known", () => {
		expect(diffFeed(articles, [])).toHaveLength(3);
	});

	test("returns nothing when every URL is known", () => {
		expect(
			diffFeed(
				articles,
				articles.map((a) => a.url),
			),
		).toEqual([]);
	});

	test("accepts a Set of existing URLs", () => {
		const result = diffFeed(
			articles,
			new Set(["https://example.com/a/", "https://example.com/c/"]),
		);
		expect(result.map((a) => a.url)).toEqual(["https://example.com/b/"]);
	});

	test("preserves feed order", () => {
		const result = diffFeed(articles, ["https://example.com/nonexistent/"]);
		expect(result).toEqual(articles);
	});
});
