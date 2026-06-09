import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

describe("cn()", () => {
  it("retourne une chaîne vide quand aucun argument n'est passé", () => {
    expect(cn()).toBe("")
  })

  it("retourne une seule classe", () => {
    expect(cn("foo")).toBe("foo")
  })

  it("fusionne plusieurs classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("ignore les valeurs falsy", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar")
  })

  it("fusionne les classes tailwind conflictuelles (tailwind-merge)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("supporte les objets conditionnels (clsx)", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe("text-red-500")
  })

  it("supporte les tableaux de classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar")
  })

  it("fusionne correctement les classes tailwind avec variantes", () => {
    expect(cn("hover:p-2", "hover:p-4")).toBe("hover:p-4")
  })
})
