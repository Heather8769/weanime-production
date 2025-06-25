// Jest type declarations are automatically available through @types/jest
// This file ensures Jest globals are properly typed in test files

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(a: number, b: number): R;
    }
  }
}

export {}