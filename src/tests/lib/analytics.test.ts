import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const sendGAEvent = vi.fn()

vi.mock("@next/third-parties/google", () => ({
  sendGAEvent: (...args: unknown[]) => sendGAEvent(...args),
}))

const ORIGINAL_GA_ID = process.env.NEXT_PUBLIC_GA_ID

async function importTrackEvent() {
  const analytics = await import("@/lib/analytics")
  return analytics.trackEvent
}

describe("trackEvent", () => {
  beforeEach(() => {
    sendGAEvent.mockClear()
  })

  afterEach(() => {
    // `process.env.X = undefined` coerce en la chaîne "undefined" plutôt que
    // de supprimer la clé : il faut `delete` explicitement dans ce cas.
    if (ORIGINAL_GA_ID === undefined) {
      delete process.env.NEXT_PUBLIC_GA_ID
    } else {
      process.env.NEXT_PUBLIC_GA_ID = ORIGINAL_GA_ID
    }
  })

  it("n'émet rien quand l'identifiant de mesure est absent", async () => {
    delete process.env.NEXT_PUBLIC_GA_ID
    const trackEvent = await importTrackEvent()

    trackEvent("chat_opened")

    expect(sendGAEvent).not.toHaveBeenCalled()
  })

  it("émet l'événement avec ses paramètres quand l'identifiant est présent", async () => {
    process.env.NEXT_PUBLIC_GA_ID = "G-TEST123456"
    const trackEvent = await importTrackEvent()

    trackEvent("chat_message_sent", { origin: "input", turn_index: 2 })

    expect(sendGAEvent).toHaveBeenCalledWith("event", "chat_message_sent", { origin: "input", turn_index: 2 })
  })

  it("émet un objet de paramètres vide quand aucun n'est fourni", async () => {
    process.env.NEXT_PUBLIC_GA_ID = "G-TEST123456"
    const trackEvent = await importTrackEvent()

    trackEvent("chat_opened")

    expect(sendGAEvent).toHaveBeenCalledWith("event", "chat_opened", {})
  })
})
