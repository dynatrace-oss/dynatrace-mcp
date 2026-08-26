import { escapeDqlStringValue, validateAdditionalFilter, validateTimeframe } from './dql-sanitize';

describe('validateTimeframe', () => {
  it.each(['24h', '7d', '30m', '12h', '90d', '2w', '1M', '1y', '30s'])('accepts valid timeframe %s', (value) => {
    expect(() => validateTimeframe(value)).not.toThrow();
  });

  it.each(['12h; DROP TABLE', 'now()', '12h | exec("bad")', '', '7 d', 'abc', '24', '1h2d', '0h', '00m'])(
    'rejects invalid timeframe %s',
    (value) => {
      expect(() => validateTimeframe(value)).toThrow();
    },
  );
});

describe('validateAdditionalFilter', () => {
  it.each([
    'vulnerability.risk.level == "CRITICAL"',
    'dt.entity.service == "SERVICE-123"',
    'entity_tags == array("dt.owner:team-foo")',
    'affected_entity.name contains "foo"',
    'vulnerability.stack == "CODE_LIBRARY" AND vulnerability.risk.score > 9',
  ])('accepts valid filter expression %s', (value) => {
    expect(() => validateAdditionalFilter(value)).not.toThrow();
  });

  it.each(['true | exec("bad")', 'x == 1 | fields secret', 'foo\nbar', 'foo\r\nbar'])(
    'rejects filter with pipe or newline: %s',
    (value) => {
      expect(() => validateAdditionalFilter(value)).toThrow();
    },
  );
});

describe('escapeDqlStringValue', () => {
  it('leaves safe values unchanged', () => {
    expect(escapeDqlStringValue('my-service')).toBe('my-service');
    expect(escapeDqlStringValue('KUBERNETES_CLUSTER-ABC123')).toBe('KUBERNETES_CLUSTER-ABC123');
  });

  it('escapes double quotes', () => {
    expect(escapeDqlStringValue('foo"bar')).toBe('foo\\"bar');
  });

  it('escapes backslashes before quotes', () => {
    expect(escapeDqlStringValue('foo\\')).toBe('foo\\\\');
    expect(escapeDqlStringValue('foo\\"bar')).toBe('foo\\\\\\"bar');
  });

  it('prevents breaking out of DQL string literal via double quote', () => {
    const malicious = 'x" | exec("bad")';
    expect(escapeDqlStringValue(malicious)).toBe('x\\" | exec(\\"bad\\")');
  });

  it('escapes newline characters', () => {
    expect(escapeDqlStringValue('foo\nbar')).toBe('foo\\nbar');
    expect(escapeDqlStringValue('foo\rbar')).toBe('foo\\rbar');
    expect(escapeDqlStringValue('foo\r\nbar')).toBe('foo\\r\\nbar');
  });

  it('escapes tab characters', () => {
    expect(escapeDqlStringValue('foo\tbar')).toBe('foo\\tbar');
  });

  it('escapes embedded newline in a pipeline-like value', () => {
    const value = 'foo\n| fetch logs';
    expect(escapeDqlStringValue(value)).toBe('foo\\n| fetch logs');
  });
});
