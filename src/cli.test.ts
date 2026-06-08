import { createCliProgram } from './cli';

describe('CLI metadata flags', () => {
  const runProgram = (args: string[]) => {
    const output: string[] = [];
    const errors: string[] = [];
    const program = createCliProgram('1.8.6');

    program.exitOverride();
    program.configureOutput({
      writeOut: (value: string) => output.push(value),
      writeErr: (value: string) => errors.push(value),
    });

    try {
      program.parse(['node', 'dist/index.js', ...args]);
      return { output: output.join(''), errors: errors.join(''), exitCode: 0 };
    } catch (error: unknown) {
      const commandError = error as { exitCode?: number; code?: string };

      return {
        output: output.join(''),
        errors: errors.join(''),
        exitCode: commandError.exitCode,
        code: commandError.code,
      };
    }
  };

  it('prints help without starting environment validation', () => {
    const result = runProgram(['--help']);

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Dynatrace Model Context Protocol (MCP) Server');
    expect(result.output).toContain('--http');
    expect(result.errors).not.toContain('DT_ENVIRONMENT');
  });

  it('prints version without starting environment validation', () => {
    const result = runProgram(['--version']);

    expect(result.exitCode).toBe(0);
    expect(result.output.trim()).toBe('1.8.6');
    expect(result.errors).not.toContain('DT_ENVIRONMENT');
  });
});
