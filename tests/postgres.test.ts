import test from 'node:test';
import assert from 'node:assert/strict';
import {database,bucket} from '../lib/storage.ts';
const enabled=process.env.MURMUR_PLATFORM_TEST==='1';
test('real Postgres enforces ownership and serializes attachment creation against draft deletion',{skip:!enabled},async()=>{
 const db=database(),id=crypto.randomUUID(),tid=crypto.randomUUID(),owner='qa-'+crypto.randomUUID(),key='audio/'+owner+'/'+crypto.randomUUID()+'.webm';
 try{
  await db.prepare('INSERT INTO audio_uploads(pathname,owner_id,created_at) VALUES(?,?,?)').bind(key,owner,Date.now()).run();
  await bucket().put(key,new File(['synthetic audio bytes'],'test.webm',{type:'audio/webm'}));
  const creation=db.batch([db.prepare('INSERT INTO notes(id,owner_id,title,created_at,updated_at) VALUES(?,?,?,?,?)').bind(id,owner,'Disposable platform test',Date.now(),Date.now()),db.prepare('INSERT INTO thoughts(id,note_id,transcript,audio_key,mime,duration,created_at) VALUES(?,?,?,?,?,?,?)').bind(tid,id,'A test thought.',key,'audio/webm',4,Date.now())]);
  const deletion=db.prepare('DELETE FROM audio_uploads WHERE pathname=? AND owner_id=? AND NOT EXISTS(SELECT 1 FROM thoughts WHERE audio_key=?) RETURNING pathname').bind(key,owner,key).first();
  const [created,deleted]=await Promise.allSettled([creation,deletion]);
  if(created.status==='fulfilled'){
   assert.ok(deleted.status==='rejected'||!deleted.value);
   assert.ok(await db.prepare('SELECT pathname FROM audio_uploads WHERE pathname=?').bind(key).first());
   assert.equal(await db.prepare('SELECT id FROM notes WHERE id=? AND owner_id=?').bind(id,'another-owner').first(),null);
   assert.equal(await new Response((await bucket().get(key))!.body).text(),'synthetic audio bytes');
  }else{
   assert.equal(deleted.status,'fulfilled');assert.ok(deleted.status==='fulfilled'&&deleted.value);
   assert.equal(await db.prepare('SELECT id FROM notes WHERE id=?').bind(id).first(),null);
  }
 }finally{
  await db.batch([db.prepare('DELETE FROM thoughts WHERE note_id=?').bind(id),db.prepare('DELETE FROM notes WHERE id=? AND owner_id=?').bind(id,owner),db.prepare('DELETE FROM audio_uploads WHERE pathname=? AND owner_id=?').bind(key,owner)]);
  await bucket().delete(key).catch(()=>{});
 }
});
