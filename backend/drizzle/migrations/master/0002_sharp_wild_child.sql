CREATE TABLE `assistant_knowledge_chunk` (
	`id` text PRIMARY KEY NOT NULL,
	`source_file` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`embedding` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assistant_knowledge_document` (
	`source_file` text PRIMARY KEY NOT NULL,
	`content_hash` text NOT NULL,
	`indexed_at` text NOT NULL
);
