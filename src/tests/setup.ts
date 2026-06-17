import "@testing-library/jest-dom"

// scrollIntoView n'est pas implémenté dans jsdom
window.HTMLElement.prototype.scrollIntoView = () => {}

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
