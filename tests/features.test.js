import test from 'node:test'
import assert from 'node:assert/strict'
import { makeAnalysisRecord } from '../src/analysisHistory.js'
import { riskSegments } from '../src/riskSegments.js'
import { handleNicknameLogin } from '../server/nicknameLogin.js'
const route = { start: { label:'학교',lat:36,lng:127 }, destination:{label:'역',lat:36,lng:127.01},
 routes:[{id:'route-1',points:[[36,127],[36,127.01]],duration:600,distance:900}],
 accidentData:{year:2024,hazards:[{id:'a',lat:36,lng:127.005,radius:100,accidents:1,injuries:2,fatalities:0}]}}
test('snapshot requires opt-in and stays frozen after live data changes',()=>{
 assert.equal(makeAnalysisRecord(route,'safe',100,'u',2024,false).snapshot,null)
 const record=makeAnalysisRecord(route,'safe',100,'u',2024,true)
 assert.equal(record.snapshot.ranked[0].risk,7)
 const old=route.routes[0].points[0][0]; route.routes[0].points[0][0]=99
 assert.equal(record.snapshot.route.routes[0].points[0][0],old)
 route.routes[0].points[0][0]=old
 assert.equal(record.snapshot.safetyLevel,100)
})
test('risk coloring preserves both endpoints and marks only nearby portions',()=>{
 const parts=riskSegments(route.routes[0],route.accidentData.hazards)
 assert.ok(parts.some(p=>p.near)); assert.ok(parts.some(p=>!p.near))
 assert.deepEqual(parts[0].points[0],route.routes[0].points[0])
 assert.deepEqual(parts.at(-1).points.at(-1),route.routes[0].points.at(-1))
 assert.ok(riskSegments(route.routes[0],[]).every(p=>!p.near))
})
const env={VITE_SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'private',VITE_SUPABASE_PUBLISHABLE_KEY:'public'}
const response=()=>({setHeader(){},end(text){this.body=JSON.parse(text)}})
function factory({allowed=true,exists=true,passwordOK=true}={}){
 return (_url,key)=> key==='private'?{
 rpc:async()=>({data:allowed}),
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:exists?{user_id:'u'}:null})})})}),
 auth:{admin:{getUserById:async()=>({data:{user:{email:'hidden@example.com'}}})}}
 }:{auth:{signInWithPassword:async()=>passwordOK?{data:{session:{access_token:'a',refresh_token:'r'}}}:{error:{message:'private auth error'}}}}
}
test('nickname login returns tokens only after password authentication',async()=>{
 const res=response();await handleNicknameLogin({method:'POST',body:{nickname:'학생',password:'testpw'}},res,env,factory())
 assert.equal(res.statusCode,200); assert.deepEqual(res.body,{access_token:'a',refresh_token:'r'})
 for(const options of [{exists:false},{passwordOK:false}]){
  const out=response(); await handleNicknameLogin({method:'POST',body:{nickname:'학생',password:'wrong'}},out,env,factory(options))
  assert.equal(out.statusCode,401); assert.ok(!JSON.stringify(out.body).includes('hidden@example.com'))
 }
})
test('nickname attempt limit and missing secret fail closed',async()=>{
 const res=response(); await handleNicknameLogin({method:'POST',body:{nickname:'학생',password:'testpw'}},res,env,factory({allowed:false}))
 assert.equal(res.statusCode,429)
 const out=response();await handleNicknameLogin({method:'POST',body:{nickname:'학생',password:'testpw'}},out,{},factory())
 assert.equal(out.statusCode,503)
})
