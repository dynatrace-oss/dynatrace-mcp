import { isTextContent } from './tool-result';

describe('isTextContent', () => {
  it('returns true for a valid text content object', () => {
    expect(isTextContent({ type: 'text', text: 'hello' })).toBe(true);
  });

  it('returns false when type is not "text"', () => {
    expect(isTextContent({ type: 'image', text: 'hello' })).toBe(false);
  });

  it('returns false when text property is missing', () => {
    expect(isTextContent({ type: 'text' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isTextContent(null)).toBe(false);
  });

  it('returns false for a plain string', () => {
    expect(isTextContent('text')).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isTextContent({})).toBe(false);
  });
});
