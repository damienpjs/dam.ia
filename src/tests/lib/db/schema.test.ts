import { describe, it, expect } from "vitest"
import { chatSessions, messages, feedbacks, messageRoleEnum } from "@/lib/db/schema"
import { getTableName } from "drizzle-orm"

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
  })

  describe("messageRoleEnum", () => {
    it("doit définir les valeurs user et assistant", () => {
      expect(messageRoleEnum.enumValues).toEqual(["user", "assistant"])
    })
  })
})
