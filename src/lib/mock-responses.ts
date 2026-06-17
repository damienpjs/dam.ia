import { MOCK_RULES, DEFAULT_MOCK_RESPONSE } from "@/constants/mock"

export { DEFAULT_MOCK_RESPONSE }

export function getMockResponse(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return DEFAULT_MOCK_RESPONSE

  for (const rule of MOCK_RULES) {
    if (rule.pattern.test(trimmed)) {
      return rule.response
    }
  }

  return DEFAULT_MOCK_RESPONSE
}
