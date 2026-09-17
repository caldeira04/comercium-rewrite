CREATE TABLE `fiscal_document` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`ref` text NOT NULL UNIQUE,
	`status` text DEFAULT 'pendente' NOT NULL,
	`environment` text DEFAULT 'homologacao' NOT NULL,
	`sefaz_code` text,
	`sefaz_message` text,
	`chave_nfe` text,
	`numero` text,
	`serie` text,
	`xml_path` text,
	`danfe_path` text,
	`qrcode_url` text,
	`consulta_url` text,
	`cancel_xml_path` text,
	`cancel_protocolo` text,
	`last_request` text,
	`last_response` text,
	`attempt_count` integer DEFAULT 1 NOT NULL,
	`created_by_user_id` text,
	`updated_by_user_id` text,
	`deleted_by_user_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`sale_id`) REFERENCES `sale`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `fiscal_document_sale_idx` ON `fiscal_document` (`sale_id`);--> statement-breakpoint
CREATE INDEX `fiscal_document_status_idx` ON `fiscal_document` (`status`);--> statement-breakpoint
ALTER TABLE `product` ADD `fiscal_ncm` text;--> statement-breakpoint
ALTER TABLE `product` ADD `fiscal_cfop` text;--> statement-breakpoint
ALTER TABLE `product` ADD `fiscal_cst` text;--> statement-breakpoint
ALTER TABLE `product` ADD `fiscal_origem` text;--> statement-breakpoint
ALTER TABLE `product` ADD `fiscal_unidade` text;
