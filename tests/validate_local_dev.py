from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def test_local_dev_files():
    required = [
        "package.json",
        "Dockerfile",
        "docker-compose.yml",
        "apps/api/server.js",
        "apps/web/dev-login.css",
        "db/migrations/0003_local_dev.sql",
    ]
    for item in required:
        assert (ROOT / item).exists(), item

def test_local_accounts_are_documented():
    readme = (ROOT / "README.md").read_text()
    assert "alexvc" in readme
    assert "mayavc" in readme
    assert "Test1234!" in readme

def test_realtime_endpoints_exist():
    api = (ROOT / "apps/api/server.js").read_text()
    assert '"/api/auth/login"' in api
    assert '"/api/chats"' in api
    assert '"/ws"' in api
    assert "broadcast(chatId, out)" in api

if __name__ == "__main__":
    test_local_dev_files()
    test_local_accounts_are_documented()
    test_realtime_endpoints_exist()
    print("local dev validation: PASS")
