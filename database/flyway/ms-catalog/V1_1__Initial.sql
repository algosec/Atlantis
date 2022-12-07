DROP TABLE IF EXISTS `external_entity`;
CREATE TABLE `external_entity` (
  `id` varchar(255) NOT NULL,
  `tenantId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `idExternal` varchar(255) NOT NULL,
  `webUrl` varchar(1024) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `teams`;
CREATE TABLE `teams` (
  `id` varchar(255) NOT NULL,
  `tenantId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `version` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `allowedAutomationBranches` json NOT NULL,
  `defaultBranch` varchar(255) DEFAULT NULL,
  `mode` varchar(255) DEFAULT NULL,
  `order` int NOT NULL,
  `externalEntity` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `garbageChannel` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order` (`order`),
  KEY `version` (`version`),
  KEY `externalEntity` (`externalEntity`),
  KEY `garbageChannel` (`garbageChannel`),
  KEY `tenantId` (`tenantId`),
  CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`externalEntity`) REFERENCES `external_entity` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teams_ibfk_2` FOREIGN KEY (`garbageChannel`) REFERENCES `external_entity` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `channels`;
CREATE TABLE `channels` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `tenantId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `team` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `title` varchar(255) NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'Unassigned',
  `jenkinsJob` varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `archived` tinyint(1) NOT NULL DEFAULT '0',
  `externalEntity` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_title` (`team`,`title`),
  KEY `team` (`team`),
  KEY `externalEntity` (`externalEntity`),
  KEY `tenantId` (`tenantId`),
  CONSTRAINT `channels_ibfk_2` FOREIGN KEY (`team`) REFERENCES `teams` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `channels_ibfk_3` FOREIGN KEY (`externalEntity`) REFERENCES `external_entity` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



DROP TABLE IF EXISTS `branches`;
CREATE TABLE `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenantId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `team` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `owner` varchar(255) NOT NULL DEFAULT 'Unassigned',
  `identifiers` json NOT NULL,
  `archived` tinyint(1) NOT NULL DEFAULT '0',
  `jiraIssue` varchar(20) DEFAULT NULL,
  `gitBranch` varchar(1024) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_title` (`team`,`title`),
  KEY `team` (`team`),
  KEY `tenantId` (`tenantId`),
  CONSTRAINT `branches_ibfk_2` FOREIGN KEY (`team`) REFERENCES `teams` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


DROP TABLE IF EXISTS `defects`;
CREATE TABLE `defects` (
  `id` varchar(255) NOT NULL,
  `tenantId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `summary` varchar(2048) NOT NULL,
  `issueType` varchar(255) NOT NULL,
  `status` varchar(255) NOT NULL,
  `assignee` varchar(255) NOT NULL,
  `rndTeam` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created` timestamp NOT NULL,
  `lastUpdate` timestamp NOT NULL,
  `severity` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



DROP TABLE IF EXISTS `channels_defects`;
CREATE TABLE `channels_defects` (
  `tenantId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `channel` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `defect` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  UNIQUE KEY `channel_defect` (`channel`,`defect`),
  KEY `channel` (`channel`),
  KEY `defect` (`defect`),
  KEY `tenantId` (`tenantId`),
  CONSTRAINT `channels_defects_ibfk_2` FOREIGN KEY (`defect`) REFERENCES `defects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `channels_defects_ibfk_3` FOREIGN KEY (`channel`) REFERENCES `channels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



DROP TABLE IF EXISTS `cards`;
CREATE TABLE `cards` (
  `id` varchar(255) NOT NULL,
  `tenantId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `channel` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `url` text NOT NULL,
  `build` varchar(128) NOT NULL,
  `runMode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `branch` int NOT NULL,
  `passed` int NOT NULL,
  `skipped` int NOT NULL,
  `failed` int NOT NULL,
  `metaData` json NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed` timestamp NULL DEFAULT NULL,
  `reviewedBy` varchar(255) DEFAULT NULL,
  `reviewedWithBypass` tinyint(1) NOT NULL DEFAULT '0',
  `previousCard` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `oldestEquivalentCard` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `externalEntity` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `channel` (`channel`),
  KEY `previousCard` (`previousCard`),
  KEY `oldestEquivalentCard` (`oldestEquivalentCard`),
  KEY `branch` (`branch`),
  KEY `externalEntity` (`externalEntity`),
  KEY `tenantId` (`tenantId`),
  KEY `cards_channel_build_idx` (`channel`,`build`),
  CONSTRAINT `cards_ibfk_2` FOREIGN KEY (`previousCard`) REFERENCES `cards` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `cards_ibfk_3` FOREIGN KEY (`oldestEquivalentCard`) REFERENCES `cards` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `cards_ibfk_4` FOREIGN KEY (`branch`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `cards_ibfk_5` FOREIGN KEY (`channel`) REFERENCES `channels` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cards_ibfk_6` FOREIGN KEY (`externalEntity`) REFERENCES `external_entity` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



DROP VIEW IF EXISTS `latest_cards`;
CREATE TABLE `latest_cards` (`id` varchar(255), `tenantId` varchar(255), `channel` varchar(255), `title` varchar(255), `url` text, `build` varchar(128), `runMode` varchar(255), `branch` int, `passed` int, `skipped` int, `failed` int, `metaData` json, `created` timestamp, `reviewed` timestamp, `reviewedBy` varchar(255), `reviewedWithBypass` tinyint(1), `previousCard` varchar(255), `oldestEquivalentCard` varchar(255), `externalEntity` varchar(255));


DROP VIEW IF EXISTS `latest_reviewed_cards`;
CREATE TABLE `latest_reviewed_cards` (`id` varchar(255), `tenantId` varchar(255), `channel` varchar(255), `title` varchar(255), `url` text, `build` varchar(128), `runMode` varchar(255), `branch` int, `passed` int, `skipped` int, `failed` int, `metaData` json, `created` timestamp, `reviewed` timestamp, `reviewedBy` varchar(255), `reviewedWithBypass` tinyint(1), `previousCard` varchar(255), `oldestEquivalentCard` varchar(255), `externalEntity` varchar(255));



DROP TABLE IF EXISTS `latest_cards`;
CREATE ALGORITHM=UNDEFINED DEFINER=`ms-catalog`@`%` SQL SECURITY DEFINER VIEW `latest_cards` AS select `cards`.`id` AS `id`,`cards`.`tenantId` AS `tenantId`,`cards`.`channel` AS `channel`,`cards`.`title` AS `title`,`cards`.`url` AS `url`,`cards`.`build` AS `build`,`cards`.`runMode` AS `runMode`,`cards`.`branch` AS `branch`,`cards`.`passed` AS `passed`,`cards`.`skipped` AS `skipped`,`cards`.`failed` AS `failed`,`cards`.`metaData` AS `metaData`,`cards`.`created` AS `created`,`cards`.`reviewed` AS `reviewed`,`cards`.`reviewedBy` AS `reviewedBy`,`cards`.`reviewedWithBypass` AS `reviewedWithBypass`,`cards`.`previousCard` AS `previousCard`,`cards`.`oldestEquivalentCard` AS `oldestEquivalentCard`,`cards`.`externalEntity` AS `externalEntity` from (`cards` join (select `cards`.`channel` AS `channel`,`cards`.`branch` AS `branch`,max(`cards`.`created`) AS `lastCreated` from `cards` group by `cards`.`channel`,`cards`.`branch`) `temp` on(((`cards`.`channel` = `temp`.`channel`) and (`cards`.`branch` = `temp`.`branch`) and (`cards`.`created` = `temp`.`lastCreated`))));

DROP TABLE IF EXISTS `latest_reviewed_cards`;
CREATE ALGORITHM=UNDEFINED DEFINER=`ms-catalog`@`%` SQL SECURITY DEFINER VIEW `latest_reviewed_cards` AS select `cards`.`id` AS `id`,`cards`.`tenantId` AS `tenantId`,`cards`.`channel` AS `channel`,`cards`.`title` AS `title`,`cards`.`url` AS `url`,`cards`.`build` AS `build`,`cards`.`runMode` AS `runMode`,`cards`.`branch` AS `branch`,`cards`.`passed` AS `passed`,`cards`.`skipped` AS `skipped`,`cards`.`failed` AS `failed`,`cards`.`metaData` AS `metaData`,`cards`.`created` AS `created`,`cards`.`reviewed` AS `reviewed`,`cards`.`reviewedBy` AS `reviewedBy`,`cards`.`reviewedWithBypass` AS `reviewedWithBypass`,`cards`.`previousCard` AS `previousCard`,`cards`.`oldestEquivalentCard` AS `oldestEquivalentCard`,`cards`.`externalEntity` AS `externalEntity` from (`cards` join (select `cards`.`channel` AS `channel`,`cards`.`branch` AS `branch`,max(`cards`.`reviewed`) AS `lastReviewed` from `cards` group by `cards`.`channel`,`cards`.`branch`) `temp` on(((`cards`.`channel` = `temp`.`channel`) and (`cards`.`branch` = `temp`.`branch`) and (`cards`.`reviewed` = `temp`.`lastReviewed`))));

