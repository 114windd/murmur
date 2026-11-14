import { neon } from "@neondatabase/serverless";
import { get, put, del, head } from "@vercel/blob";
import { parameterize } from "./platform-rules.ts";
const sql = () => neon(process.env.DATABASE_URL!, { fullResults: true });
class Statement {
  text: string;
  values: unknown[] = [];
  constructor(text: string) {
    this.text = parameterize(text);
  }
  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }
  async all<T>() {
    const result = await sql().query(this.text, this.values);
    return { results: result.rows as T[] };
  }
  async first<T>() {
    return (await this.all<T>()).results[0] || null;
  }
  async run() {
    const result = await sql().query(this.text, this.values);
    return { meta: { changes: result.rowCount } };
  }
}
export function database() {
  return {
    prepare: (text: string) => new Statement(text),
    batch: async (statements: Statement[]) => {
      const client = sql();
      return client.transaction(
        statements.map((s) => client.query(s.text, s.values)),
      );
    },
  };
}
export function bucket() {
  return {
    async put(key: string, file: File, _options?: unknown) {
      return put(key, file, {
        access: "private",
        addRandomSuffix: false,
        contentType: file.type,
      });
    },
    async get(key: string) {
      const result = await get(key, { access: "private", useCache: false });
      return result?.statusCode === 200
        ? {
            body: result.stream,
            size: result.blob.size,
            mime: result.blob.contentType,
          }
        : null;
    },
    async delete(key: string) {
      await del(key);
    },
    async head(key: string) {
      return head(key);
    },
  };
}
