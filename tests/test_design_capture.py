"""Privacy boundary tests; no live Figma token or network request is used."""
import json

import pytest

from scripts.capture_design import NoRedirect, fetch, read_source, read_token


def source_file(directory, **changes):
    path = directory / "source.json"
    path.write_text(json.dumps({"schemaVersion": 1, "fileKey": "fixture-only", "nodeIds": ["1:2"], **changes}))
    return path


def test_private_source_cannot_live_in_a_checkout_or_symlink_into_one(tmp_path):
    checkout = tmp_path / "checkout"
    checkout.mkdir()
    (checkout / ".git").mkdir()
    path = source_file(checkout)
    outside_link = tmp_path / "innocent-looking.json"
    outside_link.symlink_to(path)
    for candidate in (path, outside_link):
        with pytest.raises(ValueError, match="outside Git checkouts"):
            read_source(candidate)


@pytest.mark.parametrize("changes", [
    {"schemaVersion": True},
    {"fileKey": "https://example.com/design/private"},
    {"nodeIds": ["1:2", "1:2"]},
    {"nodeIds": ["1:2&ids=3:4"]},
    {"nodeIds": []},
    {"publish": True},
])
def test_malformed_capture_requests_are_rejected_before_network(tmp_path, changes):
    with pytest.raises(ValueError):
        read_source(source_file(tmp_path, **changes))


@pytest.mark.parametrize("url,token", [
    ("http://api.figma.com/v1/files/test", "fixture-secret"),
    ("https://api.figma.com.untrusted.example/v1/files/test", "fixture-secret"),
    ("https://user@api.figma.com/v1/files/test", "fixture-secret"),
    ("https://api.figma.com:8443/v1/files/test", "fixture-secret"),
    ("https://127.0.0.1/internal", None),
    ("https://untrusted.example/image.png", None),
])
def test_capture_never_sends_credentials_to_another_origin(url, token):
    with pytest.raises(ValueError) as rejected:
        fetch(url, token)
    assert "fixture-secret" not in str(rejected.value)


def test_api_redirect_cannot_forward_authorization():
    with pytest.raises(ValueError, match="Redirect refused"):
        NoRedirect().redirect_request(None, None, 302, "Found", {}, "https://untrusted.example/")


def test_credential_file_is_private_and_never_executed(tmp_path, monkeypatch):
    monkeypatch.delenv("FIGMA_ACCESS_TOKEN", raising=False)
    token_file = tmp_path / ".env.local"
    marker = tmp_path / "must-not-exist"
    token_file.write_text(f"UNRELATED=$(touch {marker})\nFIGMA_ACCESS_TOKEN='fixture-secret'\n")
    token_file.chmod(0o644)
    with pytest.raises(ValueError, match="chmod 600"):
        read_token(token_file)
    token_file.chmod(0o600)
    assert read_token(token_file) == "fixture-secret"
    assert not marker.exists()
