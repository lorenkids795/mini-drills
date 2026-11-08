'use strict';
const {offlinePreflight}=require('./policy.cjs');
const {LESSONS,domain}=require('../phase31/fixtures.cjs');
const CASES=Object.freeze(['project-and-IAM-preflight','direct-client-rules-deny','synthetic-review-approve-publish','role-and-assignment-denial','refresh-and-revocation','two-session-conflict-and-idempotent-retry','independent-recall','locked-backup-and-fresh-run-restore','quota-and-egress-audit']);
function plan(config){return {...offlinePreflight(config),syntheticItems:LESSONS.flatMap(x=>domain(x).catalog()).map(x=>x.id),cases:CASES,maxAccounts:10,maxRuns:3,maxApiRequestsPerRun:500,maxSnapshotDocuments:440}}
async function run(){throw Error('SPARK_LIVE_LOCKED: no live execution/provisioning in Step 2')}
if(require.main===module)run().catch(()=>{console.error('SPARK_LIVE_LOCKED: project and IAM approval required; no network attempted');process.exitCode=2});
module.exports={plan,run,scenarios:require('./scenarios.cjs')};
