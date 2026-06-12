import "@testing-library/jest-dom"

// scrollIntoView n'est pas implémenté dans jsdom
window.HTMLElement.prototype.scrollIntoView = () => {}
