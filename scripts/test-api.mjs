import assert from 'node:assert/strict';
const base=process.env.CRM_TEST_URL||'http://127.0.0.1:5173';
let checks=0;
async function request(path,method='GET',body,cookie=''){const response=await fetch(base+'/api/'+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]||''}}
function status(r,want){assert.equal(r.status,want,JSON.stringify(r.data));checks++}
async function login(email){const r=await request('auth/login','POST',{email,password:'CrmDemo!2026'});status(r,200);assert.ok(r.cookie);checks++;return r.cookie}
status(await request('clients'),401);
const client=await login('client@mini-crm.test'),employee=await login('employee@mini-crm.test'),admin=await login('admin@mini-crm.test');
status(await request('clients','GET',undefined,client),403);
status(await request('clients/c2','GET',undefined,client),403);
status(await request('clients/c2/notes','GET',undefined,client),403);
status(await request('users','GET',undefined,employee),403);
status(await request('users/demo-admin','DELETE',undefined,employee),403);
status(await request('settings','PATCH',{company:'Hacked'},employee),403);
status(await request('logs','GET',undefined,client),403);
const n=await request('clients/c1/notes','GET',undefined,client);status(n,200);assert.ok(n.data.every(n=>n.visible===1));checks++;
const own=await request('clients/c1','GET',undefined,client);status(own,200);
status(await request('clients/c1','PATCH',{status:'SUCCESS',priority:'NORMAL',company:'Hacked'},client),200);
const unchanged=await request('clients/c1','GET',undefined,client);assert.equal(unchanged.data.status,own.data.status);assert.equal(unchanged.data.company,own.data.company);checks+=2;
const created=await request('clients','POST',{name:'API Test',email:'api-test@example.com'},employee);status(created,201);const id=created.data.id;
status(await request('clients/'+id,'PATCH',{status:'SUCCESS'},employee),200);
status(await request('clients/'+id+'/notes','POST',{body:'Private test',visible:false},employee),201);
status(await request('clients/'+id,'DELETE',undefined,employee),403);
status(await request('clients/'+id,'DELETE',undefined,admin),200);
status(await request('clients/'+id,'GET',undefined,admin),404);
const em=`security-${Date.now()}@example.com`;
const registered=await request('auth/register','POST',{name:'Security Test',email:em,password:'SecurityTest!2026',role:'Admin'});status(registered,200);assert.equal(registered.data.user.role,'Client');checks++;
status(await request('users','GET',undefined,registered.cookie),403);
status(await request('users/'+registered.data.user.id,'PATCH',{role:'Employee'},admin),200);
status(await request('auth/me','GET',undefined,registered.cookie),401);
const newLogin=await request('auth/login','POST',{email:em,password:'SecurityTest!2026'});status(newLogin,200);
status(await request('users/'+registered.data.user.id,'PATCH',{blocked:true},admin),200);
status(await request('clients','GET',undefined,newLogin.cookie),401);
status(await request('auth/login','POST',{email:em,password:'SecurityTest!2026'}),401);
status(await request('users/'+registered.data.user.id,'DELETE',undefined,admin),200);
status(await request('users/demo-admin','PATCH',{role:'Client'},admin),400);
const cross=await fetch(base+'/api/clients',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json',Cookie:employee},body:JSON.stringify({name:'Bad',email:'bad@example.com'})});assert.equal(cross.status,403);checks++;
status(await request('auth/logout','POST',{},client),200);status(await request('auth/me','GET',undefined,client),401);
console.log(`PASS: ${checks} API and security checks`);
