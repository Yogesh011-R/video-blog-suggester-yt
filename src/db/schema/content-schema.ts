import {
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	uuid,
	vector,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "../utils";

export const contentType = pgEnum("content_type", ["video", "article"]);

export const content = pgTable("content", {
	id,
	title: text("title").notNull(),
	description: text("description").notNull(),
	publishDate: date("publish_date", { mode: "date" }).notNull(),
	url: text("url").notNull().unique(),
	thumbnailUrl: text("thumbnail_url").notNull(),
	type: contentType("type").notNull(),
	/** Raw HTML of the article's main content. */
	content: text("content").notNull(),
	...timestamps,
});

export const chunks = pgTable(
	"chunks",
	{
		id,
		contentId: uuid("content_id")
			.notNull()
			.references(() => content.id, { onDelete: "cascade" }),
		/** Not used for articles; reserved for time-offset chunks of video transcripts. */
		startPosition: integer("start_position"),
		/** Chunk embedding; see EMBEDDING_DIMENSIONS in lib/embedding. */
		embedding: vector("embedding", { dimensions: 1024 }),
		/** Raw chunk text (no HTML markup). */
		text: text("text").notNull(),
		...timestamps,
	},
	(table) => [index("chunks_content_id_idx").on(table.contentId)],
);

export type Content = typeof content.$inferSelect;
export type Chunk = typeof chunks.$inferSelect;
