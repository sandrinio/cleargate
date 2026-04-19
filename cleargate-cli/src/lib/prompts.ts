/**
 * prompts.ts — minimal readline-based prompt helpers
 *
 * STORY-009-03: created here (cited in story §3 as "existing"; verified absent).
 * STORY-010-01: added promptEmail for participant identity flow.
 * Used by init.ts restore flow and future commands that need interactive input.
 */
import * as readline from 'node:readline';

export interface PromptOptions {
  /** Override stdin for testing */
  stdin?: NodeJS.ReadableStream;
  /** Override stdout write for testing */
  stdout?: (s: string) => void;
}

/**
 * Prompt the user with a yes/no question.
 *
 * @param question  The question text to display (without [Y/n] suffix — caller includes it)
 * @param defaultYes  Whether Enter with no input means yes
 * @param opts  Test seams for stdin/stdout
 * @returns true for yes, false for no
 */
export async function promptYesNo(
  question: string,
  defaultYes: boolean,
  opts?: PromptOptions,
): Promise<boolean> {
  const stdoutFn = opts?.stdout ?? ((s: string) => process.stdout.write(s));
  stdoutFn(question + '\n');

  const inputStream = opts?.stdin ?? process.stdin;

  return new Promise<boolean>((resolve) => {
    const rl = readline.createInterface({
      input: inputStream,
      output: undefined, // we handle output ourselves
      terminal: false,
    });

    let answered = false;

    rl.once('line', (line: string) => {
      answered = true;
      rl.close();
      const trimmed = line.trim().toLowerCase();
      if (trimmed === '') {
        resolve(defaultYes);
      } else if (trimmed === 'y' || trimmed === 'yes') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    rl.once('close', () => {
      if (!answered) {
        // EOF without a line — treat as default
        resolve(defaultYes);
      }
    });
  });
}

/**
 * Prompt the user for a text value with an optional default.
 *
 * @param question     The question text to display
 * @param defaultValue The value used when the user presses Enter without typing
 * @param opts         Test seams for stdin/stdout
 * @returns The entered string, or `defaultValue` if Enter is pressed with no input
 */
export async function promptEmail(
  question: string,
  defaultValue: string,
  opts?: PromptOptions,
): Promise<string> {
  const stdoutFn = opts?.stdout ?? ((s: string) => process.stdout.write(s));
  stdoutFn(question + '\n');

  const inputStream = opts?.stdin ?? process.stdin;

  return new Promise<string>((resolve) => {
    const rl = readline.createInterface({
      input: inputStream,
      output: undefined, // we handle output ourselves
      terminal: false,
    });

    let answered = false;

    rl.once('line', (line: string) => {
      answered = true;
      rl.close();
      const trimmed = line.trim();
      resolve(trimmed === '' ? defaultValue : trimmed);
    });

    rl.once('close', () => {
      if (!answered) {
        // EOF without a line — use default
        resolve(defaultValue);
      }
    });
  });
}
