// Cloudflare Workers の型定義
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1ExecResult>;
    batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  }

  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first(): Promise<any>;
    run(): Promise<D1Result>;
    all(): Promise<D1Result>;
  }

  interface D1Result {
    success: boolean;
    meta: {
      changed_db: boolean;
      changes: number;
      duration: number;
      last_row_id: number;
      rows_read: number;
      rows_written: number;
      size_after: number;
    };
    results?: any[];
  }

  interface D1ExecResult {
    count: number;
    duration: number;
  }
}

export {};
