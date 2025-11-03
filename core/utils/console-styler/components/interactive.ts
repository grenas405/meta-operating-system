// components/interactive.ts
export class InteractivePrompts {
  /**
   * Ask a yes/no question
   */
  static async confirm(
    question: string,
    defaultValue = false,
  ): Promise<boolean> {
    const defaultText = defaultValue ? "[Y/n]" : "[y/N]";
    const prompt = `${question} ${defaultText}: `;

    const input = await this.readLine(prompt);

    if (!input) return defaultValue;
    return input.toLowerCase().startsWith("y");
  }

  /**
   * Ask for text input
   */
  static async input(question: string, defaultValue?: string): Promise<string> {
    const defaultText = defaultValue ? ` [${defaultValue}]` : "";
    const prompt = `${question}${defaultText}: `;

    const input = await this.readLine(prompt);
    return input || defaultValue || "";
  }

  /**
   * Select from a list
   */
  static async select<T>(
    question: string,
    choices: Array<{ label: string; value: T; description?: string }>,
  ): Promise<T> {
    console.log(question);
    console.log();

    choices.forEach((choice, index) => {
      const description = choice.description ? ` - ${choice.description}` : "";
      console.log(`  ${index + 1}. ${choice.label}${description}`);
    });
    console.log();

    while (true) {
      const input = await this.readLine("Select (number): ");
      const index = parseInt(input) - 1;

      if (index >= 0 && index < choices.length) {
        return choices[index].value;
      }

      console.log("Invalid selection. Please try again.");
    }
  }

  /**
   * Multi-select from a list
   */
  static async multiSelect<T>(
    question: string,
    choices: Array<{ label: string; value: T }>,
  ): Promise<T[]> {
    console.log(question);
    console.log("(Enter numbers separated by commas, e.g., 1,3,4)");
    console.log();

    choices.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice.label}`);
    });
    console.log();

    const input = await this.readLine("Select: ");
    const indices = input.split(",")
      .map((s) => parseInt(s.trim()) - 1)
      .filter((i) => i >= 0 && i < choices.length);

    return indices.map((i) => choices[i].value);
  }

  /**
   * Password input (hidden)
   */
  static async password(question: string): Promise<string> {
    const prompt = `${question}: `;

    // Note: Actual password hiding requires raw mode terminal handling
    // This is a simplified version
    return await this.readLine(prompt);
  }

  /**
   * Number input
   */
  static async number(
    question: string,
    defaultValue?: number,
  ): Promise<number> {
    while (true) {
      const input = await this.input(question, defaultValue?.toString());
      const num = parseFloat(input);

      if (!isNaN(num)) {
        return num;
      }

      console.log("Invalid number. Please try again.");
    }
  }

  /**
   * Read line from stdin
   */
  private static async readLine(prompt: string): Promise<string> {
    await Deno.stdout.write(new TextEncoder().encode(prompt));

    const buf = new Uint8Array(1024);
    const n = await Deno.stdin.read(buf);

    if (n === null) return "";

    return new TextDecoder().decode(buf.subarray(0, n)).trim();
  }
}
