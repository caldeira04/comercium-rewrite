CREATE TABLE `assistant_action` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`message_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`values` text NOT NULL,
	`warnings` text,
	`expires_at` text NOT NULL,
	`decided_at` text,
	`decided_by_user_id` text,
	`result_reference_type` text,
	`result_reference_id` text,
	`error` text,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`conversation_id`) REFERENCES `assistant_conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assistant_action_conversation_idx` ON `assistant_action` (`conversation_id`);