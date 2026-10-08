import pytest


@pytest.fixture
def zone(signed_in):
    zone = signed_in.post('/api/zones', json={'name': 'example.com'}).json()
    return signed_in, '/api/zones/' + zone['id']


def test_bind_preview_and_atomic_import(zone):
    client, path = zone
    content = '''$ORIGIN example.com.
$TTL 1h
@ IN SOA ns.example.com. hostmaster.example.com. (1 2h 15m 1w 5m)
@ IN NS ns.example.com.
www IN A 192.0.2.1
    IN A 192.0.2.2
ipv6 IN AAAA 2001:db8::1
alias IN CNAME www
@ IN MX 10 mail
txt IN TXT "hello; world" "second chunk"
child IN NS ns.example.net.
ptr IN PTR www
_https._tcp IN SRV 10 5 443 www
@ IN CAA 0 issue "letsencrypt.org"
'''
    response = client.post(path + '/import', json={'content': content})
    assert response.status_code == 200, response.text
    preview = response.json()
    assert len(preview['records']) == 9 and len(preview['skipped']) == 2
    assert client.get(path + '/records').json()['total'] == 2
    assert next(r for r in preview['records'] if r['type'] == 'CNAME')['values'] == ['www.example.com.']
    assert next(r for r in preview['records'] if r['type'] == 'A')['ttl'] == 3600
    assert client.post(path + '/import', json={'content': content, 'preview': False}).json()['imported'] == 9
    assert client.get(path + '/records').json()['total'] == 11
    conflict = 'new 300 IN A 192.0.2.3\nwww 300 IN A 192.0.2.4'
    assert client.post(path + '/import', json={'content': conflict, 'preview': False}).status_code == 409
    assert client.get(path + '/records?search=new').json()['total'] == 0


@pytest.mark.parametrize('content', [
    '$INCLUDE /etc/passwd', '$GENERATE 1-10 host$ A 192.0.2.$',
    'outside.net. 300 IN A 192.0.2.1', 'www 300 IN A 999.0.0.1',
    'www 300 IN CNAME a.example.\nwww 300 IN A 192.0.2.1',
    'www 300 IN CNAME a.example.\nwww 300 IN CNAME b.example.',
    'www 300 IN HTTPS 1 .', '; only a comment',
])
def test_invalid_imports_never_write(zone, content):
    client, path = zone
    response = client.post(path + '/import', json={'content': content, 'preview': False})
    assert response.status_code == 422, response.text
    assert client.get(path + '/records').json()['total'] == 2


def test_exports_roundtrip_and_ownership(zone):
    client, path = zone
    for kind, value in [('A', '192.0.2.1'), ('TXT', 'hello; world'), ('CNAME', 'target.example.net')]:
        assert client.post(path + '/records', json={'name': kind.lower(), 'type': kind, 'values': [value]}).status_code == 201
    export = client.get(path + '/export')
    assert export.status_code == 200
    assert len(export.json()['records']) == 5
    assert 'attachment' in export.headers['content-disposition']
    bind = client.get(path + '/export?format=bind').text
    for record in client.get(path + '/records').json()['items']:
        if not record['system']:
            client.delete(path + '/records/' + record['id'])
    response = client.post(path + '/import', json={'content': bind, 'preview': False})
    assert response.status_code == 200, response.text
    assert response.json()['imported'] == 3
    client.post('/api/auth/login', json={'username': 'other'})
    assert client.get(path + '/export').status_code == 404
    assert client.post(path + '/import', json={'content': bind}).status_code == 404


def test_preview_is_revalidated_and_limits_are_enforced(zone):
    client, path = zone
    content = 'www 300 IN A 192.0.2.1'
    assert client.post(path + '/import', json={'content': content}).status_code == 200
    client.post(path + '/records', json={'name': 'www', 'type': 'A', 'values': ['192.0.2.2']})
    assert client.post(path + '/import', json={'content': content, 'preview': False}).status_code == 409
    assert client.get(path + '/records?type=A').json()['items'][0]['values'] == ['192.0.2.2']
    too_many = '\n'.join(f'host{i} 300 IN A 192.0.2.1' for i in range(1001))
    assert client.post(path + '/import', json={'content': too_many, 'preview': False}).status_code == 422
    assert client.post(path + '/import', json={'content': ';' + 'x' * 1_000_000}).status_code == 422
    assert client.get(path + '/records').json()['total'] == 3
