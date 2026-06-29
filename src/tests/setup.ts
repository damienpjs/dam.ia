import "@testing-library/jest-dom"

// scrollIntoView n'est pas implémenté dans jsdom
window.HTMLElement.prototype.scrollIntoView = () => {}

// IntersectionObserver n'est pas implémenté dans jsdom
class MockIntersectionObserver {
  observe = () => {}
  unobserve = () => {}
  disconnect = () => {}
  takeRecords = () => []
  root = null
  rootMargin = ""
  thresholds = []
}
window.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver
globalThis.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver

// matchMedia n'est pas implémenté dans jsdom
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList
