import { spawn } from 'node:child_process';

/**
 * Opens a URL in the user's default browser.
 *
 * This is a lightweight, cross-platform replacement for the `open` npm package
 * that avoids external dependencies so the code can be bundled into a single file
 * (e.g. for MCPB bundles).
 *
 * Supported platforms: macOS (`open`), Windows (`start`), Linux (`xdg-open`).
 */
export function openUrl(url: string): void {
  const { platform } = process;

  let command: string;
  let args: string[];

  if (platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', 'url', url];
  } else {
    // Linux / other — rely on xdg-open being available on the system PATH.
    command = 'xdg-open';
    args = [url];
  }

  const child = spawn(command, args, {
    stdio: 'ignore',
    detached: true,
  });

  // Allow the parent process to exit without waiting for the browser.
  child.unref();
}
