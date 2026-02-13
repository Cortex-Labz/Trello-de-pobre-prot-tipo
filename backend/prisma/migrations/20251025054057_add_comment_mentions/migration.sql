-- CreateTable
CREATE TABLE "comment_mentions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comment_id" TEXT NOT NULL,
    "mentioned_user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comment_mentions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comment_mentions_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "comment_mentions_comment_id_mentioned_user_id_key" ON "comment_mentions"("comment_id", "mentioned_user_id");
