import { describe, it, expect } from "vitest"
import { chatSessions, messages, feedbacks, messageRoleEnum } from "@/lib/db/schema"
import { getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/pg-core"

describe("DB Schema", () => {
  describe("chatSessions", () => {
    it("doit avoir le bon nom de table", () => {
      expect(getTableName(chatSessions)).toBe("chat_sessions")
    })

    it("doit avoir les colonnes attendues", () => {
      const columns = Object.keys(chatSessions)
      expect(columns).toContain("id")
      expect(columns).toContain("createdAt")
      expect(columns).toContain("updatedAt")
    })

    it("doit avoir un $onUpdate sur updatedAt qui retourne une Date", () => {
      const onUpdate = chatSessions.updatedAt.onUpdateFn
      expect(onUpdate).toBeDefined()
      const result = onUpdate!()
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe("messages", () => {
    it("doit avoir le bon nom de table", () => {
      expect(getTableName(messages)).toBe("messages")
    })

    it("doit avoir les colonnes attendues", () => {
      const columns = Object.keys(messages)
      expect(columns).toContain("id")
      expect(columns).toContain("sessionId")
      expect(columns).toContain("role")
      expect(columns).toContain("content")
      expect(columns).toContain("createdAt")
    })

    it("doit avoir une référence cascade vers chatSessions", () => {
      const sessionIdCol = messages.sessionId
      expect(sessionIdCol.config.notNull).toBe(true)

      const { foreignKeys } = getTableConfig(messages)
      expect(foreignKeys).toHaveLength(1)
      const ref = foreignKeys[0].reference()
      expect(ref.foreignColumns[0].name).toBe("id")
      expect(foreignKeys[0].onDelete).toBe("cascade")
    })
  })

  describe("feedbacks", () => {
    it("doit avoir le bon nom de table", () => {
      expect(getTableName(feedbacks)).toBe("feedbacks")
    })

    it("doit avoir les colonnes attendues", () => {
      const columns = Object.keys(feedbacks)
      expect(columns).toContain("id")
      expect(columns).toContain("messageId")
      expect(columns).toContain("rating")
      expect(columns).toContain("comment")
      expect(columns).toContain("createdAt")
    })

    it("doit avoir une référence cascade vers messages", () => {
      const messageIdCol = feedbacks.messageId
      expect(messageIdCol.config.notNull).toBe(true)

      const { foreignKeys } = getTableConfig(feedbacks)
      expect(foreignKeys).toHaveLength(1)
      const ref = foreignKeys[0].reference()
      expect(ref.foreignColumns[0].name).toBe("id")
      expect(foreignKeys[0].onDelete).toBe("cascade")
    })
  })

  describe("messageRoleEnum", () => {
    it("doit définir les valeurs user et assistant", () => {
      expect(messageRoleEnum.enumValues).toEqual(["user", "assistant"])
    })
  })
})
