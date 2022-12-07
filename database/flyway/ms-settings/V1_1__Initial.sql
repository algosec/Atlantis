DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `key` varchar(255) NOT NULL,
  `tenantId` varchar(255) NOT NULL,
  `value` json NOT NULL,
  PRIMARY KEY (`key`),
  KEY `tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
