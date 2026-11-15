"""Adapter invariants: private state never bypasses auth or shared commands."""
import secrets
from pathlib import Path

from mcp import Client
from starlette.testclient import TestClient

from rome.engine import Engine
from rome.server import WIDGET_URI, create_app, create_mcp


def test_preview_auth_origin_and_shared_command(tmp_path):
    engine = Engine(tmp_path / "campaign.db")
    token = secrets.token_urlsafe(32)
    app, _ = create_app(engine, token)
    auth = {"Authorization": f"Bearer {token}"}
    try:
        with TestClient(app, base_url="http://localhost:8787") as client:
            request = {"name": "inspect_campaign", "arguments": {}}
            assert client.post("/api/tool", json=request).status_code == 401
            assert client.post("/mcp", json={}).status_code == 401
            assert client.post("/api/tool", json=request, headers=auth | {"Origin": "https://attacker.invalid"}).status_code == 403
            assert client.post("/api/tool", json=request, headers=auth | {"Host": "attacker.invalid"}).status_code == 400
            state = client.post("/api/tool", json=request, headers=auth).json()["structuredContent"]["state"]
            fleet = state["fleets"][0]
            payload = {"name": "issue_order", "arguments": {
                "command_id": "preview-select-1", "expected_revision": state["revision"],
                "action": "select", "payload": {"kind": "fleet", "id": fleet["id"]}}}
            response = client.post("/api/tool", json=payload, headers=auth)
            assert response.status_code == 200
            assert not response.json()["isError"]
            assert engine.snapshot()["selection"] == {"kind": "fleet", "id": fleet["id"]}
            revision = engine.snapshot()["revision"]
            retry = client.post("/api/tool", json=payload, headers=auth).json()
            assert not retry["isError"]
            assert engine.snapshot()["revision"] == revision
    finally:
        engine.close()


async def test_official_mcp_client_shared_state_and_embedded_resource(tmp_path):
    engine = Engine(tmp_path / "campaign.db")
    widget = Path(__file__).resolve().parents[1] / "dist/index.html"
    server = create_mcp(engine, widget)
    try:
        async with Client(server) as client:
            tools = await client.list_tools()
            by_name = {tool.name: tool for tool in tools.tools}
            assert by_name["inspect_campaign"].annotations.read_only_hint
            assert not by_name["issue_order"].annotations.read_only_hint
            assert by_name["open_workspace"].meta["ui"]["resourceUri"] == WIDGET_URI
            assert "proposal" in by_name["propose_development"].input_schema["properties"]
            initial = (await client.call_tool("open_workspace", {})).structured_content["state"]
            fleet = initial["fleets"][0]
            selected = await client.call_tool("issue_order", {
                "command_id": "chat-select-1", "expected_revision": initial["revision"],
                "action": "select", "payload": {"kind": "fleet", "id": fleet["id"]}})
            assert not selected.is_error
            assert engine.snapshot()["selection"]["id"] == fleet["id"]
            # A genuinely bundled UI, not a hand-written test widget, is the resource.
            resource = await client.read_resource(WIDGET_URI)
            assert resource.contents[0].mime_type == "text/html;profile=mcp-app"
            invalid = await client.call_tool("issue_order", {
                "command_id": "bad-write", "expected_revision": engine.snapshot()["revision"],
                "action": "award_resources", "payload": {"gold": 999999}})
            assert invalid.is_error
            assert engine.snapshot()["selection"]["id"] == fleet["id"]
    finally:
        engine.close()
