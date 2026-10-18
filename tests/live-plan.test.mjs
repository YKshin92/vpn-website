import test from 'node:test';import assert from 'node:assert/strict';import {livePlanDigest} from '../.build/live-rotation.js';
test('saved plan digest survives JSONB key reordering and detects changed fields',()=>{
 const a={instance:'server',nested:{b:2,a:1},nameServers:['one','two']},b={nameServers:['one','two'],nested:{a:1,b:2},instance:'server'};assert.equal(livePlanDigest(a),livePlanDigest(b));assert.notEqual(livePlanDigest(a),livePlanDigest({...b,instance:'other'}));
});
