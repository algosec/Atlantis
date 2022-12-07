DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(255) NOT NULL,
  `tenantId` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Null for SSO',
  `displayName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `roles` json NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenantId_username` (`tenantId`,`username`),
  KEY `tenantId` (`tenantId`),
  KEY `username_password` (`username`,`password`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'uuid()',
  `tenantId` varchar(255) NOT NULL,
  `user` varchar(255) NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiration` timestamp NOT NULL,
  `lastActivity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `userAgent` text NOT NULL,
  `ipAddress` varchar(255) NOT NULL,
  `refreshToken` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user` (`user`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- create scheduler to remove expired rows
CREATE EVENT `session_expiration`
    ON SCHEDULE EVERY 15 MINUTE
        STARTS '2020-01-01 00:00:00'
    ON COMPLETION PRESERVE
    DO DELETE FROM `sessions` WHERE `expiration` <= NOW();