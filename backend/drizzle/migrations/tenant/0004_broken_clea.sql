-- Custom SQL migration file, put your code below! --
INSERT INTO `client` (`id`, `name`)
VALUES (0, 'Consumidor Final')
ON CONFLICT(`id`) DO UPDATE SET
  `name` = excluded.`name`,
  `deleted_at` = NULL;
