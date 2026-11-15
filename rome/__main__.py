"""Run one private host. Never bind the campaign server to a public interface."""
from __future__ import annotations

import argparse
import asyncio
from contextlib import suppress
import os
from pathlib import Path
import secrets
import sqlite3
import sys

import uvicorn


def local_token(path: Path) -> str:
    configured = os.environ.get("ROME_TOKEN")
    if configured:
        if len(configured) < 32:
            raise ValueError("ROME_TOKEN must be at least 32 characters.")
        return configured
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        with path.open("x", encoding="utf-8") as file:
            os.chmod(path, 0o600)
            file.write(secrets.token_urlsafe(32))
    except FileExistsError:
        pass
    token = path.read_text(encoding="utf-8").strip()
    if len(token) < 32:
        raise ValueError(f"Invalid local token file: {path}")
    return token


async def serve(args, engine, token):
    from .server import create_app
    app, mcp = create_app(engine, token)
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=args.port,
                                         log_level="warning", access_log=False))
    if not args.stdio:
        await server.serve()
        return
    http = asyncio.create_task(server.serve())
    stdio = asyncio.create_task(mcp.run_stdio_async())
    try:
        done, _ = await asyncio.wait([http, stdio], return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            task.result()
    finally:
        server.should_exit = True
        if not stdio.done():
            stdio.cancel()
        with suppress(asyncio.CancelledError):
            await stdio
        await http


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=Path(os.environ.get("ROME_DB", "saves/campaign.db")))
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument("--stdio", action="store_true", help="MCP stdio for an authenticated Secure MCP Tunnel; also serves local preview")
    parser.add_argument("--print-token", action="store_true", help="Print the local preview token ONLY to your own terminal; never share it")
    parser.add_argument("--backup", type=Path, help="Back up a stopped campaign with SQLite's backup API, then exit")
    args = parser.parse_args()
    args.db = args.db.resolve()
    if not 1024 <= args.port <= 65535:
        parser.error("port must be between 1024 and 65535")
    token_path = args.db.parent / "local-token"
    token = local_token(token_path)
    if args.print_token:
        print(token)
        return
    # A distinct SQLite write lock gives portable, crash-released single-host
    # ownership without holding the campaign database's write lock forever.
    owner = sqlite3.connect(str(args.db) + ".owner.db", timeout=0)
    try:
        owner.execute("BEGIN EXCLUSIVE")
    except sqlite3.OperationalError:
        owner.close()
        parser.error("This campaign is already hosted. Connect to that host; do not launch another clock.")
    from .engine import Engine
    engine = Engine(args.db)
    try:
        if args.backup:
            args.backup.parent.mkdir(parents=True, exist_ok=True)
            engine.backup(args.backup)
            print(f"Backup written to {args.backup}", file=sys.stderr)
        else:
            print(f"Rome host: http://127.0.0.1:{args.port}/ — private campaign {args.db}", file=sys.stderr)
            print(f"Local preview token is in {token_path}; use --print-token locally. No public ingress enabled.", file=sys.stderr)
            asyncio.run(serve(args, engine, token))
    finally:
        engine.close()
        owner.rollback()
        owner.close()


if __name__ == "__main__":
    main()
