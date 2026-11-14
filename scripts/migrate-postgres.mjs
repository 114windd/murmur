import {readFile,readdir} from 'node:fs/promises';
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required.');
const sql=neon(process.env.DATABASE_URL);
await sql.query('CREATE TABLE IF NOT EXISTS murmur_migrations (name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())');
const applied=new Set((await sql.query('SELECT name FROM murmur_migrations')).map(row=>row.name));
for(const name of (await readdir('db/postgres')).filter(n=>n.endsWith('.sql')).sort()){
 if(applied.has(name))continue;
 const statements=(await readFile('db/postgres/'+name,'utf8')).split(';').map(s=>s.trim()).filter(Boolean);
 await sql.transaction([...statements.map(s=>sql.query(s)),sql.query('INSERT INTO murmur_migrations(name) VALUES($1)',[name])]);
 console.log('Applied '+name);
}
