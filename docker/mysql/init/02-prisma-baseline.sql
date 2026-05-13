CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `_prisma_migrations` (
  `id`,
  `checksum`,
  `finished_at`,
  `migration_name`,
  `logs`,
  `rolled_back_at`,
  `started_at`,
  `applied_steps_count`
) VALUES (
  '0e2d7df5-9003-4cd7-8f52-ec1e054dd8e4',
  '0365dce918d2b80a479a9ea0261e4ca16079bf9f6d650c7380919518e4de4fb6',
  CURRENT_TIMESTAMP(3),
  '20260513174000_init_mysql',
  NULL,
  NULL,
  CURRENT_TIMESTAMP(3),
  1
) ON DUPLICATE KEY UPDATE `checksum` = VALUES(`checksum`);
