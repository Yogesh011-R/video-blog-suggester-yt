import { describe, expect, test } from "bun:test";
import { extractArticle } from "./article.ts";

/** Wrap article-body HTML in the blog's real page structure. */
function page(opts: {
	body: string;
	ogImage?: string | null;
	/** Extra markup dropped in `.layout` next to `<article>` (e.g. a sidebar). */
	aside?: string;
}): string {
	const og =
		opts.ogImage == null
			? ""
			: `<meta property="og:image" content="${opts.ogImage}">`;
	return `<!DOCTYPE html><html lang="en"><head><title>t</title>${og}</head>
<body>
	<header>Site chrome <h1>Web Dev Simplified Blog</h1></header>
	<div class="layout">
		<article class="content">
			<header>
				<h1 class="title">The Real Title</h1>
				<p class="publish-date">September 30, 2019</p>
			</header>
			<main>${opts.body}</main>
		</article>
		${opts.aside ?? ""}
	</div>
</body></html>`;
}

describe("extractArticle — thumbnail", () => {
	test("uses the og:image as the thumbnail", () => {
		const { thumbnailUrl } = extractArticle(
			page({
				ogImage: "https://blog.webdevsimplified.com/2019-09/es6/og.webp",
				body: "<p>x</p>",
			}),
		);
		expect(thumbnailUrl).toBe(
			"https://blog.webdevsimplified.com/2019-09/es6/og.webp",
		);
	});

	test("returns null when there is no og:image", () => {
		const { thumbnailUrl } = extractArticle(
			page({ ogImage: null, body: "<p>x</p>" }),
		);
		expect(thumbnailUrl).toBeNull();
	});
});

describe("extractArticle — main content selection", () => {
	test("returns the inner HTML of <article> <main>, markup intact", () => {
		const { contentHtml } = extractArticle(
			page({ body: `<p>Keep <strong>this</strong> markup.</p>` }),
		);
		expect(contentHtml).toContain("<strong>this</strong>");
		expect(contentHtml).toContain("<p>");
	});

	test("prefers the <main> inside <article> over an unrelated <main>", () => {
		const html = `<!DOCTYPE html><html><head></head><body>
			<main>WRONG — page level main</main>
			<article><main><p>RIGHT — article main</p></main></article>
		</body></html>`;
		const { contentHtml, chunks } = extractArticle(html);
		expect(contentHtml).toContain("RIGHT");
		expect(contentHtml).not.toContain("WRONG");
		expect(chunks).toEqual(["RIGHT — article main"]);
	});

	test("falls back to a bare <main> when there is no <article>", () => {
		const html = `<html><body><main><p>Solo main.</p></main></body></html>`;
		expect(extractArticle(html).chunks).toEqual(["Solo main."]);
	});

	test("throws when there is no <main>", () => {
		const html = `<html><body><article><p>no main here</p></article></body></html>`;
		expect(() => extractArticle(html)).toThrow(/main/i);
	});
});

describe("extractArticle — chunking by <h2>", () => {
	test("keeps everything in one chunk when there is no <h2>", () => {
		const { chunks } = extractArticle(
			page({ body: `<p>First paragraph.</p><p>Second paragraph.</p>` }),
		);
		expect(chunks).toEqual(["First paragraph.\n\nSecond paragraph."]);
	});

	test("puts text before the first <h2> in its own leading chunk", () => {
		const { chunks } = extractArticle(
			page({
				body: `
					<p>Intro line one.</p>
					<p>Intro line two.</p>
					<h2>Section One</h2>
					<p>Body of one.</p>
					<h2>Section Two</h2>
					<p>Body of two.</p>`,
			}),
		);
		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toBe("Intro line one.\n\nIntro line two.");
		expect(chunks[1]).toBe("Section One\n\nBody of one.");
		expect(chunks[2]).toBe("Section Two\n\nBody of two.");
	});

	test("each chunk starts with its <h2> text as the first line", () => {
		const { chunks } = extractArticle(
			page({
				body: `<h2>What Is Focus?</h2><p>An explanation.</p><h2>Conclusion</h2><p>Done.</p>`,
			}),
		);
		expect(chunks.map((c) => c.split("\n")[0])).toEqual([
			"What Is Focus?",
			"Conclusion",
		]);
	});

	test("does not emit an empty leading chunk when the article opens with an <h2>", () => {
		const { chunks } = extractArticle(
			page({ body: `<h2>Only Section</h2><p>Content.</p>` }),
		);
		expect(chunks).toEqual(["Only Section\n\nContent."]);
	});

	test("does not split on <h3> or other headings", () => {
		const { chunks } = extractArticle(
			page({ body: `<p>Intro.</p><h3>Sub heading</h3><p>After sub.</p>` }),
		);
		expect(chunks).toHaveLength(1);
		expect(chunks[0]).toContain("Sub heading");
	});

	test("respects an <h2> nested inside a wrapper element", () => {
		const { chunks } = extractArticle(
			page({
				body: `
					<p>Intro.</p>
					<section>
						<p>Nested intro.</p>
						<h2>Nested Heading</h2>
						<p>Nested body.</p>
					</section>`,
			}),
		);
		expect(chunks).toEqual([
			"Intro.\n\nNested intro.",
			"Nested Heading\n\nNested body.",
		]);
	});

	test("ignores <h2> elements outside of <main> (e.g. a sidebar)", () => {
		const { chunks } = extractArticle(
			page({
				body: `<p>Just one paragraph, no headings.</p>`,
				aside: `<aside>Newsletter <h2>Subscribe now</h2><p>spam</p></aside>`,
			}),
		);
		expect(chunks).toEqual(["Just one paragraph, no headings."]);
	});
});

describe("extractArticle — text is plain, not markup", () => {
	test("strips inline tags and attributes from chunk text", () => {
		const { chunks } = extractArticle(
			page({
				body: `<p>Hello <strong>bold</strong> and <a href="https://example.com">a link</a> here.</p>`,
			}),
		);
		expect(chunks[0]).toBe("Hello bold and a link here.");
		expect(chunks[0]).not.toContain("<strong>");
		expect(chunks[0]).not.toContain("href");
	});

	test("decodes HTML entities", () => {
		const { chunks } = extractArticle(
			page({ body: `<p>Tom &amp; Jerry, 1 &lt; 2</p>` }),
		);
		expect(chunks[0]).toBe("Tom & Jerry, 1 < 2");
	});

	test("preserves code block text content", () => {
		const { chunks } = extractArticle(
			page({
				body: `<h2>Example</h2><pre><code>const x = 1\nconst y = 2</code></pre>`,
			}),
		);
		expect(chunks[0]).toBe("Example\n\nconst x = 1\nconst y = 2");
	});
});

describe("extractArticle — whitespace normalization", () => {
	test("collapses runs of spaces and blank lines, and trims", () => {
		const { chunks } = extractArticle(
			page({
				body: `


					<p>Line   with     spaces</p>



					<p>Next   line</p>


				`,
			}),
		);
		expect(chunks).toEqual(["Line with spaces\n\nNext line"]);
		expect(chunks[0]).toBe(chunks[0].trim());
		expect(chunks[0]).not.toMatch(/\n{3,}/);
		expect(chunks[0]).not.toMatch(/ {2,}/);
	});

	test("does not produce chunks that are empty or whitespace-only", () => {
		const { chunks } = extractArticle(
			page({
				body: `<h2>A</h2><h2>B</h2><p>only b has text</p>`,
			}),
		);
		expect(chunks).toEqual(["A", "B\n\nonly b has text"]);
		for (const chunk of chunks) expect(chunk.trim().length).toBeGreaterThan(0);
	});
});
