/**
 * prompts.ts — minimal readline-based Y/n prompt helper
 *
 * STORY-009-03: created here (cited in story §3 as "existing"; verified absent).
 * Used by init.ts restore flow and future commands that need a binary yes/no prompt.
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
