import { createFileRoute } from "@tanstack/react-router";
import { start } from "workflow/api";
import { ingestBlog } from "#/workflows/ingest-blog";

export const Route = createFileRoute("/api/workflow/ingest/blog")({
	server: {
		handlers: {
			GET: async () => {
				const run = await start(ingestBlog, []);
				return Response.json({ runId: run.runId });
			},
		},
	},
});
