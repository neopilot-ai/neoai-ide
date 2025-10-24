// ref: https://github.com/asg017/sqlite-vec/blob/main/examples/simple-node/demo.mjs
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

const db_path = process.env.DB_PATH || './runbooks.db'

const db = new Database(db_path);
sqliteVec.load(db);


// export the getRunbooksLinks function
// function returns the list of runbooks links, fetching them from the database
export function getRunbooksLinks(query: number[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    try {
      const sql = `
        SELECT
          source_link
        FROM vec_runbooks_docs
        WHERE embedding MATCH ?
          AND k = 20
        ORDER BY distance
      `;

      const rows = db.prepare(sql).all(new Float32Array(query)) as { source_link: string }[];
      const links = [...new Set(rows.map(row => row.source_link))];
      resolve(links);
    } catch (error) {
      reject(error);
    }
  });
}
