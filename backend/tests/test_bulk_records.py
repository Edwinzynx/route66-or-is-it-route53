import pytest


@pytest.fixture
def records(signed_in):
    zone = signed_in.post('/api/zones', json={'name': 'bulk.example'}).json()
    path = '/api/zones/' + zone['id'] + '/records'
    ids = [signed_in.post(path, json={'name': name, 'type': 'A', 'values': ['192.0.2.1']}).json()['id'] for name in ['one', 'two']]
    return signed_in, path, ids


def test_bulk_ttl_and_delete(records):
    client, path, ids = records
    response = client.post(path + '/bulk', json={'operation': 'ttl', 'ids': ids, 'ttl': 120})
    assert response.json() == {'affected': 2}
    assert all(client.get(path + '/' + rid).json()['ttl'] == 120 for rid in ids)
    assert client.post(path + '/bulk', json={'operation': 'delete', 'ids': ids}).json() == {'affected': 2}
    assert client.get(path).json()['total'] == 2


@pytest.mark.parametrize('operation', ['ttl', 'delete'])
def test_bulk_failure_rolls_back(records, operation):
    client, path, ids = records
    body = {'operation': operation, 'ids': [ids[0], 'missing']}
    if operation == 'ttl': body['ttl'] = 60
    assert client.post(path + '/bulk', json=body).status_code == 404
    assert client.get(path + '/' + ids[0]).json()['ttl'] == 300
    default = next(r['id'] for r in client.get(path).json()['items'] if r['system'])
    body['ids'] = [ids[0], default]
    assert client.post(path + '/bulk', json=body).status_code == 409
    assert client.get(path + '/' + ids[0]).json()['ttl'] == 300


def test_bulk_validation_and_ownership(records):
    client, path, ids = records
    for body in [{'operation': 'ttl', 'ids': ids}, {'operation': 'ttl', 'ids': ids, 'ttl': -1},
                 {'operation': 'delete', 'ids': []}, {'operation': 'delete', 'ids': ids * 2}]:
        assert client.post(path + '/bulk', json=body).status_code == 422
    client.post('/api/auth/login', json={'username': 'other'})
    assert client.post(path + '/bulk', json={'operation': 'delete', 'ids': ids}).status_code == 404
