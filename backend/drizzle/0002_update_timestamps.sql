ALTER TABLE `tenant` RENAME COLUMN "created-at" TO "created_at";--> statement-breakpoint
ALTER TABLE `tenant` RENAME COLUMN "updated-at" TO "updated_at";--> statement-breakpoint
ALTER TABLE `tenant` RENAME COLUMN "deleted-at" TO "deleted_at";--> statement-breakpoint
ALTER TABLE `tenant_users` RENAME COLUMN "created-at" TO "created_at";--> statement-breakpoint
ALTER TABLE `tenant_users` RENAME COLUMN "updated-at" TO "updated_at";--> statement-breakpoint
ALTER TABLE `tenant_users` RENAME COLUMN "deleted-at" TO "deleted_at";