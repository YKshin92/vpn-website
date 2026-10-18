import {Resolver} from 'node:dns/promises';
import {isIP} from 'node:net';
import {LightsailClient,GetInstanceCommand,GetStaticIpsCommand,GetDomainCommand} from '@aws-sdk/client-lightsail';
import {Route53Client,ListHostedZonesByNameCommand,GetHostedZoneCommand,ListResourceRecordSetsCommand} from '@aws-sdk/client-route-53';
import type {ListHostedZonesByNameCommandOutput,ListResourceRecordSetsCommandOutput,RRType} from '@aws-sdk/client-route-53';
import {STSClient,GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {fromIni} from '@aws-sdk/credential-providers';
import type {FastifyInstance} from 'fastify';

export interface InfrastructureConfig {enabled:boolean;profile:string;account:string;region:string;instance:string;domain:string;dnsServers:string[];servicePort?:number}
export function infrastructureConfig(env:NodeJS.ProcessEnv=process.env):InfrastructureConfig {
  return {enabled:env.IEUM_AWS_READ_ONLY==='true',profile:env.IEUM_AWS_PROFILE||'ieum-readonly',account:env.IEUM_AWS_ACCOUNT_ID||'',region:'ap-northeast-2',instance:'vpnServer001',domain:'ieumvpn.link',dnsServers:(env.IEUM_DNS_SERVERS??'').split(',').map(s=>s.trim()).filter(Boolean),servicePort:env.IEUM_OUTLINE_SERVICE_PORT?Number(env.IEUM_OUTLINE_SERVICE_PORT):undefined};
}
type RecordValue={type:string;values:string[];ttl?:number};
type DnsZone={id:string;provider:'lightsail'|'route53';nameServers:string[];records:RecordValue[]};
export interface ReadOperations {
  identity():Promise<string>;
  instance():Promise<{name?:string;state?:string;publicIp?:string;isStaticIp?:boolean}>;
  staticIps():Promise<{name?:string;ip?:string;attachedTo?:string}[]>;
  lightsailZone():Promise<DnsZone[]>;
  route53Zones():Promise<DnsZone[]>;
  publicDns():Promise<{nameServers:string[];addresses:string[];nsError?:string;aError?:string}>;
}
function failure(error:unknown):string {
  const name=(error as {name?:string;code?:string})?.name??'';
  if(/AccessDenied|Unauthorized/.test(name))return 'permission-denied';
  if(/Credential|Token|Signature|SSO|UnrecognizedClient|InvalidClient/.test(name))return 'authentication-required';
  if(/NotFound|NoSuchHostedZone/.test(name))return 'not-found';
  if(/Timeout|Abort/.test(name))return 'timeout';
  return 'query-failed'; // Never send AWS messages, credential paths, ARNs or stacks to the browser.
}
const normalize=(name:string)=>name.toLowerCase().replace(/\.$/,'');
const sameNs=(a:string[],b:string[])=>a.length>0&&a.length===b.length&&[...a].map(normalize).sort().join('|')===[...b].map(normalize).sort().join('|');
async function section<T>(fn:()=>Promise<T>){try{return {status:'ok' as const,data:await fn()};}catch(error){return {status:'error' as const,error:failure(error)};}}
export function awsReadOperations(config:InfrastructureConfig):ReadOperations {
  // Explicit shared profile only; no automatic default credential-chain fallback.
  const credentials=fromIni({profile:config.profile,clientConfig:{region:config.region}});
  const options={credentials,maxAttempts:1,requestHandler:{connectionTimeout:2000,requestTimeout:5000}};
  const lightsail=new LightsailClient({...options,region:config.region});
  // Lightsail DNS operations are global and only available through us-east-1.
  const dns=new LightsailClient({...options,region:'us-east-1'});
  const route53=new Route53Client({...options,region:'us-east-1'});
  const sts=new STSClient({...options,region:config.region});
  const resolver=new Resolver({timeout:2000,tries:1});
  if(config.dnsServers.length)resolver.setServers(config.dnsServers);
  return {
    async identity(){return (await sts.send(new GetCallerIdentityCommand({}))).Account??'';},
    async instance(){const {instance}=await lightsail.send(new GetInstanceCommand({instanceName:config.instance}));if(!instance)throw Error('Missing instance');return {name:instance.name,state:instance.state?.name,publicIp:instance.publicIpAddress,isStaticIp:instance.isStaticIp};},
    async staticIps(){const result:Awaited<ReturnType<ReadOperations['staticIps']>>=[];let pageToken:string|undefined;
      for(let page=0;page<20;page++){const r=await lightsail.send(new GetStaticIpsCommand({pageToken}));result.push(...(r.staticIps??[]).filter(ip=>ip.attachedTo===config.instance).map(ip=>({name:ip.name,ip:ip.ipAddress,attachedTo:ip.attachedTo})));pageToken=r.nextPageToken;if(!pageToken)return result;}throw Error('Pagination limit');},
    async lightsailZone(){const {domain}=await dns.send(new GetDomainCommand({domainName:config.domain}));if(!domain)return [];const entries=(domain.domainEntries??[]).filter(e=>normalize(e.name||config.domain)===config.domain||e.name==='@');return [{id:domain.name??config.domain,provider:'lightsail',nameServers:entries.filter(e=>e.type==='NS').map(e=>e.target??'').filter(Boolean),records:entries.filter(e=>['A','AAAA','CNAME'].includes(e.type??'')).map(e=>({type:e.type!,values:e.target?[e.target]:[]}))}];},
    async route53Zones(){const zones:DnsZone[]=[];let DNSName:string|undefined=config.domain,HostedZoneId:string|undefined;
      for(let page=0;page<20;page++){
        const r:ListHostedZonesByNameCommandOutput=await route53.send(new ListHostedZonesByNameCommand({DNSName,HostedZoneId,MaxItems:100}));
        for(const z of r.HostedZones??[]){if(normalize(z.Name??'')!==config.domain||z.Config?.PrivateZone||!z.Id)continue;
          const detail=await route53.send(new GetHostedZoneCommand({Id:z.Id}));const records:RecordValue[]=[];let StartRecordName:string|undefined=config.domain,StartRecordType:RRType|undefined='A',StartRecordIdentifier:string|undefined;
          for(let recordPage=0;recordPage<20;recordPage++){
            const rr:ListResourceRecordSetsCommandOutput=await route53.send(new ListResourceRecordSetsCommand({HostedZoneId:z.Id,StartRecordName,StartRecordType,StartRecordIdentifier,MaxItems:100}));
            records.push(...(rr.ResourceRecordSets??[]).filter(v=>normalize(v.Name??'')===config.domain&&['A','AAAA','CNAME'].includes(v.Type??'')).map(v=>({type:v.Type!,values:v.ResourceRecords?.map(a=>a.Value??'')??(v.AliasTarget?[`alias:${v.AliasTarget.DNSName}`]:[]),ttl:v.TTL})));
            if(!rr.IsTruncated||normalize(rr.NextRecordName??'')!==config.domain)break;
            if(recordPage===19)throw Error('Pagination limit');StartRecordName=rr.NextRecordName;StartRecordType=rr.NextRecordType;StartRecordIdentifier=rr.NextRecordIdentifier;
          }
          zones.push({id:z.Id,provider:'route53',nameServers:detail.DelegationSet?.NameServers??[],records});
        }
        if(!r.IsTruncated||normalize(r.NextDNSName??'')!==config.domain)return zones;
        DNSName=r.NextDNSName;HostedZoneId=r.NextHostedZoneId;
      }throw Error('Pagination limit');},
    async publicDns(){const [ns,a]=await Promise.allSettled([resolver.resolveNs(config.domain),resolver.resolve4(config.domain)]);return {nameServers:ns.status==='fulfilled'?ns.value:[],addresses:a.status==='fulfilled'?a.value:[],...(ns.status==='rejected'?{nsError:'dns-query-failed'}:{}),...(a.status==='rejected'?{aError:'dns-query-failed'}:{})};}
  };
}
export async function readInfrastructure(config:InfrastructureConfig,operations?:ReadOperations){
  const base={mode:'aws-read-only',region:config.region,instanceName:config.instance,domain:config.domain,observedAt:new Date().toISOString(),changesAllowed:false};
  if(!config.enabled||!/^\d{12}$/.test(config.account)||!config.profile)return {...base,status:'not-configured',message:'AWS 조회용 프로필·계정 ID 설정 후 명시적으로 조회를 활성화해 주세요'};
  if(config.dnsServers.length>4||config.dnsServers.some(s=>!isIP(s)))return {...base,status:'configuration-error',message:'DNS 조회 서버는 유효한 IP 주소를 최대 4개 지정해 주세요'};
  const ops=operations??awsReadOperations(config);
  const identity=await section(()=>ops.identity());
  if(identity.status==='error')return {...base,status:'authentication-error',error:identity.error};
  if(identity.data!==config.account)return {...base,status:'account-mismatch',message:'설정된 AWS 계정과 인증된 계정이 달라 리소스 조회를 중단했습니다'};
  const [instance,staticIps,lightsail,route53,publicDns]=await Promise.all([section(()=>ops.instance()),section(()=>ops.staticIps()),section(()=>ops.lightsailZone()),section(()=>ops.route53Zones()),section(()=>ops.publicDns())]);
  const zones=[...(lightsail.status==='ok'?lightsail.data:[]),...(route53.status==='ok'?route53.data:[])];
  const matched=publicDns.status==='ok'&&!publicDns.data.nsError?zones.filter(z=>sameNs(z.nameServers,publicDns.data.nameServers)):[];
  // A visible NS match is evidence only; incomplete permissions or cached DNS must stay visible.
  const sourcesComplete=[lightsail,route53].every(s=>s.status==='ok'||s.error==='not-found');
  const dnsManager=matched.length===1&&sourcesComplete?{status:'ns-match',provider:matched[0].provider,zoneId:matched[0].id}: {status:matched.length>1?'ambiguous':'unverified'};
  const ipMatch=instance.status==='ok'&&publicDns.status==='ok'&&!publicDns.data.aError&&instance.data.publicIp?publicDns.data.addresses.includes(instance.data.publicIp):null;
  const complete=[instance,staticIps].every(s=>s.status==='ok')&&sourcesComplete&&publicDns.status==='ok'&&!publicDns.data.nsError&&!publicDns.data.aError;
  return {...base,status:complete?'ok':'partial',accountSuffix:config.account.slice(-4),instance,staticIps,lightsail,route53,publicDns,dnsManager,ipMatch};
}
export function infrastructureTargets(env:NodeJS.ProcessEnv=process.env):InfrastructureConfig[]{
  const base=infrastructureConfig(env);if(!env.IEUM_AWS_SERVER_TARGETS)return [base];
  const targets:unknown=JSON.parse(env.IEUM_AWS_SERVER_TARGETS);
  if(!Array.isArray(targets)||!targets.length||targets.length>10)throw Error('Invalid targets');
  const names=new Set<string>();return targets.map(target=>{
    if(!target||typeof target.instance!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(target.instance)||typeof target.domain!=='string'||target.domain.length>253||!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(target.domain)||names.has(target.instance))throw Error('Invalid target');
    if(target.servicePort!==undefined&&(!Number.isInteger(target.servicePort)||target.servicePort<1||target.servicePort>65535))throw Error('Invalid service port');
    names.add(target.instance);return {...base,instance:target.instance,domain:target.domain,servicePort:target.servicePort};
  });
}
async function readFleet(){
  let configs:InfrastructureConfig[];try{configs=infrastructureTargets();}catch{return {mode:'aws-read-only',status:'configuration-error',observedAt:new Date().toISOString(),changesAllowed:false,servers:[]};}
  const servers=await Promise.all(configs.map(config=>readInfrastructure(config)));
  return {...servers[0],servers,fleetStatus:servers.every(s=>s.status==='ok')?'ok':'partial'};
}
export function infrastructureReader(){let active:ReturnType<typeof readFleet>|undefined;let cached:{expires:number;value:Awaited<ReturnType<typeof readFleet>>}|undefined;
  return async()=>{if(cached&&cached.expires>Date.now())return cached.value;if(active)return active;active=readFleet();try{const value=await active;cached={expires:Date.now()+10000,value};return value;}finally{active=undefined;}};
}
export function installInfrastructure(app:FastifyInstance,reader:()=>Promise<unknown>){app.get('/api/admin/infrastructure',async()=>reader());}
