#!/usr/bin/env python3
"""VoiceCore development API: an executable, persistent local messenger backend.
Not production authentication: deploy behind a proper OTP/OIDC provider before public use.
"""
import hashlib, json, secrets, sqlite3, time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
DB = Path(__file__).with_name("voicecore-dev.sqlite3")

def connect():
    db = sqlite3.connect(DB); db.row_factory = sqlite3.Row
    db.executescript('''PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, public_id TEXT UNIQUE NOT NULL, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, title TEXT, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS chat_members (chat_id INTEGER, user_id INTEGER, PRIMARY KEY(chat_id,user_id), FOREIGN KEY(chat_id) REFERENCES chats(id), FOREIGN KEY(user_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, chat_id INTEGER NOT NULL, sender_id INTEGER NOT NULL, body TEXT NOT NULL CHECK(length(body)<=4000), created_at INTEGER NOT NULL, FOREIGN KEY(chat_id) REFERENCES chats(id), FOREIGN KEY(sender_id) REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS call_rooms (id TEXT PRIMARY KEY, chat_id INTEGER NOT NULL, kind TEXT NOT NULL, created_by INTEGER NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN');''')
    return db

def init():
    db=connect()
    if not db.execute('SELECT 1 FROM users').fetchone():
        token='dev-alex-token'; db.execute('INSERT INTO users(public_id,username,display_name,token_hash,created_at) VALUES(?,?,?,?,?)',('1000000001','alexv','Алекс Волков',hashlib.sha256(token.encode()).hexdigest(),int(time.time())))
        db.execute('INSERT INTO chats(kind,title,created_at) VALUES(?,?,?)',('DIRECT','Майя Чен',int(time.time())))
        db.execute('INSERT INTO chat_members(chat_id,user_id) VALUES(1,1)'); db.execute('INSERT INTO messages(chat_id,sender_id,body,created_at) VALUES(1,1,?,?)',('Добро пожаловать в VoiceCore.',int(time.time())))
    db.commit(); db.close()

def payload(handler):
    length=int(handler.headers.get('Content-Length','0')); raw=handler.rfile.read(length)
    try: return json.loads(raw or '{}')
    except json.JSONDecodeError: raise ValueError('Некорректный JSON')

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT/'apps/web'),**kwargs)
    def log_message(self, fmt,*args): print('[voicecore]',fmt%args)
    def response(self, status, data):
        encoded=json.dumps(data,ensure_ascii=False).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(encoded))); self.send_header('Access-Control-Allow-Origin','*'); self.end_headers(); self.wfile.write(encoded)
    def do_OPTIONS(self): self.send_response(204); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type'); self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS'); self.end_headers()
    def user(self, db):
        auth=self.headers.get('Authorization',''); token=auth.removeprefix('Bearer ').strip()
        row=db.execute('SELECT * FROM users WHERE token_hash=?',(hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
        if not row: raise PermissionError('Требуется вход')
        return row
    def do_GET(self):
        path=urlparse(self.path).path
        if not path.startswith('/api/'): return super().do_GET()
        db=connect()
        try:
            user=self.user(db)
            if path=='/api/v1/me': data={'id':user['public_id'],'username':user['username'],'displayName':user['display_name']}
            elif path=='/api/v1/chats':
                rows=db.execute('''SELECT c.id,c.kind,c.title,MAX(m.created_at) last_at, (SELECT body FROM messages WHERE chat_id=c.id ORDER BY id DESC LIMIT 1) preview FROM chats c JOIN chat_members cm ON cm.chat_id=c.id WHERE cm.user_id=? GROUP BY c.id ORDER BY last_at DESC''',(user['id'],)).fetchall(); data=[dict(r) for r in rows]
            elif path.startswith('/api/v1/chats/') and path.endswith('/messages'):
                cid=int(path.split('/')[4]); self.member(db,cid,user['id']); data=[dict(r) for r in db.execute('''SELECT m.id,m.body,m.created_at,u.public_id senderId,u.display_name senderName FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.chat_id=? ORDER BY m.id''',(cid,)).fetchall()]
            else: return self.response(404,{'error':'Не найдено'})
            self.response(200,data)
        except PermissionError as e: self.response(401,{'error':str(e)})
        except Exception as e: self.response(400,{'error':str(e)})
        finally: db.close()
    def member(self,db,cid,uid):
        if not db.execute('SELECT 1 FROM chat_members WHERE chat_id=? AND user_id=?',(cid,uid)).fetchone(): raise PermissionError('Нет доступа к чату')
    def do_POST(self):
        path=urlparse(self.path).path; db=connect()
        try:
            body=payload(self)
            if path=='/api/v1/auth/development-register':
                username=body.get('username','').strip().lstrip('@').lower(); name=body.get('displayName','').strip()
                if not (5<=len(username)<=32 and username.replace('_','').isalnum() and name): raise ValueError('Укажите username от 5 до 32 символов и имя')
                token=secrets.token_urlsafe(32); public=str(secrets.randbelow(8_999_999_999)+1_000_000_000)
                db.execute('INSERT INTO users(public_id,username,display_name,token_hash,created_at) VALUES(?,?,?,?,?)',(public,username,name,hashlib.sha256(token.encode()).hexdigest(),int(time.time()))); db.commit(); return self.response(201,{'accessToken':token,'userId':public})
            user=self.user(db)
            if path=='/api/v1/chats':
                title=body.get('title','').strip()[:80] or 'Новый чат'; kind=body.get('kind','DIRECT')
                if kind not in ('DIRECT','GROUP'): raise ValueError('Неверный тип чата')
                cur=db.execute('INSERT INTO chats(kind,title,created_at) VALUES(?,?,?)',(kind,title,int(time.time()))); db.execute('INSERT INTO chat_members(chat_id,user_id) VALUES(?,?)',(cur.lastrowid,user['id'])); db.commit(); return self.response(201,{'id':cur.lastrowid,'title':title,'kind':kind})
            if path.startswith('/api/v1/chats/') and path.endswith('/messages'):
                cid=int(path.split('/')[4]); self.member(db,cid,user['id']); text=body.get('body','').strip()
                if not text: raise ValueError('Сообщение не может быть пустым')
                cur=db.execute('INSERT INTO messages(chat_id,sender_id,body,created_at) VALUES(?,?,?,?)',(cid,user['id'],text,int(time.time()))); db.commit(); return self.response(201,{'id':cur.lastrowid,'body':text})
            if path.startswith('/api/v1/chats/') and path.endswith('/calls'):
                cid=int(path.split('/')[4]); self.member(db,cid,user['id']); kind=body.get('kind','VOICE')
                if kind not in ('VOICE','VIDEO'): raise ValueError('Неверный тип звонка')
                room=secrets.token_urlsafe(12); db.execute('INSERT INTO call_rooms(id,chat_id,kind,created_by,created_at) VALUES(?,?,?,?,?)',(room,cid,kind,user['id'],int(time.time()))); db.commit(); return self.response(201,{'roomId':room,'kind':kind,'status':'OPEN'})
            self.response(404,{'error':'Не найдено'})
        except (PermissionError,ValueError,sqlite3.IntegrityError) as e: self.response(400,{'error':str(e)})
        finally: db.close()

if __name__=='__main__':
    init(); print('VoiceCore API: http://127.0.0.1:8787 — dev token: dev-alex-token'); ThreadingHTTPServer(('0.0.0.0',8787),Handler).serve_forever()
