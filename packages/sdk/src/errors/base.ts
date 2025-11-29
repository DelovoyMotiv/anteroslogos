/**
 * Base error class for all Anóteros Lógos SDK errors
 */
export class AnterosError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly data?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    data?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    if (code !== undefined) {
      this.code = code;
    }
    if (data !== undefined) {
      this.data = data;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      data: this.data,
    };
  }
}
