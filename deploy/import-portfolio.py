#!/usr/bin/env python3
"""Import an explicitly approved private batch without logging credentials or records.

Run locally with SSH forwarding, or on the verified host. All input paths are outside
the source checkout. The digest must come from the reviewed private artifact.
"""
import argparse
import hashlib
import json
import urllib.error
import urllib.request
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--batch', required=True)
parser.add_argument('--expected-sha256', required=True)
parser.add_argument('--credentials', required=True)
parser.add_argument('--url', default='http://127.0.0.1:8088')
parser.add_argument('--approved-by', required=True)
parser.add_argument('--approval-date', required=True)
parser.add_argument('--approval-evidence', required=True)
parser.add_argument('--receipt', required=True)
args = parser.parse_args()
raw = Path(args.batch).read_bytes()
source_sha = hashlib.sha256(raw).hexdigest()
if source_sha != args.expected_sha256:
    raise SystemExit('Batch differs from the reviewed digest; no request made.')
batch = json.loads(raw)
credentials = json.loads(Path(args.credentials).read_text())
client = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def call(method, path, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
        headers['organizationid'] = credentials['organizationId']
    request = urllib.request.Request(args.url.rstrip('/') + '/api/v2' + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers, method=method)
    try:
        with client.open(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit('Request failed with HTTP ' + str(error.code)) from None

login = call('POST', '/authenticator/landlord/signin', {'email': credentials['email'], 'password': credentials['password']})
token = login['accessToken']
result = call('POST', '/portfolio/import', {'batch': batch, 'sourceSha256': source_sha,
    'approval': {'owner': args.approved_by, 'date': args.approval_date, 'evidence': args.approval_evidence}}, token)
live = call('GET', '/portfolio', token=token)
assert live['state'] == 'ready'
assert [a['id'] for a in live['assets']] == [a['id'] for a in batch['assets']]
assert len(live['notes']) == len(batch['notes'])
assert all(n['outstanding_principal_cents'] is None and not n['posted_payments'] for n in live['notes'])
receipt = {'result': result, 'sourceSha256': source_sha, 'approvalDate': args.approval_date,
           'livePortfolio': live}
target = Path(args.receipt)
with target.open('x') as stream:
    target.chmod(0o600)
    json.dump(receipt, stream, indent=2)
print('Import verified:', len(live['assets']), 'assets,', len(live['notes']), 'note headers,', len(live['reconciliation_cases']), 'reconciliation cases. No financial postings or notices.')
