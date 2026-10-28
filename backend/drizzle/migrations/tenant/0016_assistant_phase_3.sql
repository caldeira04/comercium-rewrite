CREATE TABLE `assistant_attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text,
	`message_id` text,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`conversation_id`) REFERENCES `assistant_conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_attachment_conversation_idx` ON `assistant_attachment` (`conversation_id`);--> statement-breakpoint
ALTER TABLE `assistant_action` ADD `previous_values` text;