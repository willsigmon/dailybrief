CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`briefingId` int NOT NULL,
	`type` enum('urgent','important','strategic') NOT NULL,
	`category` varchar(100) NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`contactName` varchar(255),
	`organization` varchar(255),
	`actionRequired` text,
	`deadline` timestamp,
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`executiveSummary` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `briefings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendarEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`briefingId` int NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`location` text,
	`attendees` text,
	`eventType` varchar(100),
	`strategicValue` text,
	`preparationNeeded` text,
	CONSTRAINT `calendarEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `llmAnalyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`briefingId` int NOT NULL,
	`topic` text NOT NULL,
	`claudeAnalysis` text,
	`geminiAnalysis` text,
	`grokAnalysis` text,
	`perplexityAnalysis` text,
	`consensus` text,
	`dissent` text,
	`recommendation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `llmAnalyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`organization` varchar(255),
	`email` varchar(320),
	`healthScore` int DEFAULT 50,
	`trend` enum('up','stable','down','new') NOT NULL DEFAULT 'stable',
	`lastInteraction` timestamp,
	`lastInteractionType` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relationships_id` PRIMARY KEY(`id`)
);
