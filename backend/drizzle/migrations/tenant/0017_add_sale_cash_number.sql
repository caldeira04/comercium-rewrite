-- Número sequencial de vendas e caixas, exibido ao cliente no lugar do UUID.
-- Os registros existentes são numerados pela ordem de criação; o índice único
-- só é criado depois do preenchimento.
ALTER TABLE `cash` ADD `number` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `cash` SET `number` = `numbered`.`rn`
FROM (SELECT `id`, ROW_NUMBER() OVER (ORDER BY `created_at`, `rowid`) AS `rn` FROM `cash`) AS `numbered`
WHERE `numbered`.`id` = `cash`.`id`;--> statement-breakpoint
CREATE UNIQUE INDEX `cash_number_idx` ON `cash` (`number`);--> statement-breakpoint
ALTER TABLE `sale` ADD `number` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `sale` SET `number` = `numbered`.`rn`
FROM (SELECT `id`, ROW_NUMBER() OVER (ORDER BY `created_at`, `rowid`) AS `rn` FROM `sale`) AS `numbered`
WHERE `numbered`.`id` = `sale`.`id`;--> statement-breakpoint
CREATE UNIQUE INDEX `sale_number_idx` ON `sale` (`number`);--> statement-breakpoint
-- Garantia para inserts que não informam o número (o app informa): o próximo
-- número é atribuído logo após o insert, dentro da mesma instrução.
CREATE TRIGGER `cash_assign_number` AFTER INSERT ON `cash`
WHEN NEW.`number` = 0
BEGIN
    UPDATE `cash` SET `number` = (SELECT COALESCE(MAX(`number`), 0) + 1 FROM `cash`) WHERE `rowid` = NEW.`rowid`;
END;--> statement-breakpoint
CREATE TRIGGER `sale_assign_number` AFTER INSERT ON `sale`
WHEN NEW.`number` = 0
BEGIN
    UPDATE `sale` SET `number` = (SELECT COALESCE(MAX(`number`), 0) + 1 FROM `sale`) WHERE `rowid` = NEW.`rowid`;
END;--> statement-breakpoint
CREATE INDEX `sale_cash_idx` ON `sale` (`cash_id`);--> statement-breakpoint
CREATE INDEX `cash_movement_cash_idx` ON `cash_movement` (`cash_id`);--> statement-breakpoint
CREATE INDEX `cash_movement_reference_idx` ON `cash_movement` (`reference_type`,`reference_id`);--> statement-breakpoint
CREATE INDEX `stock_movement_product_created_idx` ON `stock_movement` (`product_id`,`created_at`);
