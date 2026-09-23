import importlib.util, json, threading, urllib.request
from pathlib import Path
spec=importlib.util.spec_from_file_location('voicecore_api', Path(__file__).parents[1]/'apps/api/server.py')
api=importlib.util.module_from_spec(spec); spec.loader.exec_module(api)
api.DB.unlink(missing_ok=True); api.init()
server=api.ThreadingHTTPServer(('127.0.0.1',0),api.Handler); threading.Thread(target=server.serve_forever,daemon=True).start(); base=f'http://127.0.0.1:{server.server_port}'
def request(path, method='GET', body=None):
    data=json.dumps(body).encode() if body else None; r=urllib.request.Request(base+path,data=data,method=method,headers={'Authorization':'Bearer dev-alex-token','Content-Type':'application/json'}); return json.loads(urllib.request.urlopen(r).read())
assert request('/api/v1/me')['username']=='alexv'
message=request('/api/v1/chats/1/messages','POST',{'body':'Проверка API'})
assert message['body']=='Проверка API'
assert any(x['body']=='Проверка API' for x in request('/api/v1/chats/1/messages'))
call=request('/api/v1/chats/1/calls','POST',{'kind':'VOICE'})
assert call['status']=='OPEN' and call['roomId']
server.shutdown(); api.DB.unlink(missing_ok=True); print('VoiceCore API integration checks passed.')
