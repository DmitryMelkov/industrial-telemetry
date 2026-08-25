declare module 'tarantool-driver' {
  interface TarantoolOptions {
    host?: string;
    port?: number;
  }

  class TarantoolConnection {
    constructor(options?: TarantoolOptions);
    ping(): Promise<unknown>;
    replace(space: string | number, tuple: unknown[]): Promise<unknown>;
    select(
      space: string | number,
      index: string | number,
      limit: number,
      offset: number,
      key: unknown[],
    ): Promise<unknown[][]>;
    destroy(): void;
  }

  export default TarantoolConnection;
}
