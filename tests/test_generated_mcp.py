"""Structured steward-input proof via the SDK, not live ChatGPT generation.

Only public MCP tools drive the campaign; event-clock orders avoid sleeps,
background simulation, wall-clock patches and network/model dependencies.
"""
from copy import deepcopy
from itertools import count

import pytest

from mcp import Client

from rome.engine import Engine
from rome.server import create_mcp


def item(state, collection, identifier):
    return next(value for value in state[collection] if value["id"] == identifier)


def node(state, tree_id, node_id):
    return item(item(state, "trees", tree_id), "nodes", node_id)


def assert_payment(before, after, costs):
    assert after["resources"] == {
        resource: amount - costs.get(resource, 0)
        for resource, amount in before["resources"].items()
    }


async def test_generated_naval_and_religious_ambitions_survive_mcp_restart(tmp_path):
    path = tmp_path / "generated-campaign.sqlite"
    identifiers = count()

    async def inspect(client):
        result = await client.call_tool("inspect_campaign", {})
        assert not result.is_error, result.content
        return result.structured_content["state"]

    async def call(client, tool, arguments):
        result = await client.call_tool(tool, arguments)
        assert not result.is_error, result.content
        return result.structured_content

    async def command(client, action, payload):
        state = await inspect(client)
        return (await call(client, "issue_order", {
            "command_id": f"generated-order-{next(identifiers)}",
            "expected_revision": state["revision"],
            "action": action, "payload": payload,
        }))["state"]

    async def propose(client, proposal):
        before = await inspect(client)
        after = (await call(client, "propose_development", {
            "command_id": f"generated-proposal-{next(identifiers)}",
            "expected_revision": before["revision"], "proposal": proposal,
        }))["state"]
        assert after["resources"] == before["resources"]
        assert item(after, "trees", proposal["id"])["status"] == "proposed"
        return await command(client, "accept_tree", {"tree_id": proposal["id"]})

    async def start(client, node_id, spec):
        preview = await call(client, "preview_order", {
            "action": "project", "payload": {"node_id": node_id},
        })
        assert preview["blockers"] == []
        before = await inspect(client)
        after = await command(client, "start_project", {"node_id": node_id})
        assert_payment(before, after, spec["costs"])
        project = next(p for p in after["projects"] if p["node_id"] == node_id)
        assert project["costs_paid"] == spec["costs"]
        assert project["finish_day"] == before["day"] + spec["duration"]
        return project

    async def finish(client, project):
        state = await command(client, "clock", {
            "mode": "until_project", "node_id": project["node_id"],
        })
        assert state["day"] == project["finish_day"]
        return state

    # These authored fixtures are distinct goals, not the optional tutorial tree.
    navy = {
        "id": "monsoon-refuge", "title": "A refuge for monsoon-damaged ships",
        "ambition": "Build repair capacity at Berenike before risking distant voyages.",
        "version": 1, "provenance": {"author": "structured steward acceptance fixture", "version": "1"},
        "nodes": [
            {"id": "refuge-hull-survey", "title": "Survey storm damage with local shipwrights",
             "description": "Compare hull failures reported by returning Red Sea crews.",
             "rule": "hull_research", "location_id": "berenike", "prerequisites": [],
             "icon": {"base": "stronger-hulls", "variant": "navy"},
             "scope": "Berenike repair harbor", "people": ["shipwrights", "returning crews"]},
            {"id": "refuge-repair-yard", "title": "Charter the monsoon repair yard",
             "description": "Turn the completed damage survey into local repair facilities.",
             "rule": "shipyard", "location_id": "berenike", "prerequisites": ["refuge-hull-survey"],
             "icon": {"base": "shipyards"}, "scope": "Berenike repair harbor",
             "people": ["shipwrights", "harbor administrators"]},
        ],
    }
    reform = {
        "id": "harbor-sanctuary-accord", "title": "An accord for the harbor's many faiths",
        "ambition": "Protect shared worship and holy-day observance among the repair harbor's workers.",
        "version": 1, "provenance": {"author": "structured steward acceptance fixture", "version": "1"},
        "nodes": [
            {"id": "harbor-worship-hearings", "title": "Hear the shipworkers' religious communities",
             "description": "Use the completed hull survey's worker contacts to convene affected communities.",
             "rule": "consultation", "location_id": "berenike", "prerequisites": ["refuge-hull-survey"],
             "icon": {"base": "harbor-many-faiths", "badge": "faith"},
             "scope": "Berenike harbor worship", "people": ["dockworkers", "temple custodians"]},
            {"id": "harbor-sanctuary-council", "title": "Council of the Shared Harbor Sanctuary",
             "description": "Give the consulted communities a named representative institution.",
             "rule": "institution", "location_id": "berenike", "prerequisites": ["harbor-worship-hearings"],
             "icon": {"base": "assembly", "badge": "faith"},
             "scope": "Berenike harbor worship", "people": ["dockworkers", "temple custodians"]},
            {"id": "harbor-observance-charter", "title": "Charter of Equal Harbor Observance",
             "description": "Debate holy-day protections through the newly chartered council.",
             "rule": "law", "location_id": "berenike", "prerequisites": ["harbor-sanctuary-council"],
             "icon": {"base": "law", "badge": "faith"},
             "scope": "Berenike harbor worship", "people": ["dockworkers", "temple custodians"]},
        ],
    }

    engine = Engine(path)
    try:
        async with Client(create_mcp(engine)) as client:
            catalog = await call(client, "inspect_catalog", {})
            rules = {rule["id"]: rule for rule in catalog["rules"]["rules"]}
            approved_icon = next(entry for entry in catalog["entries"] if entry["id"] == "stronger-hulls")
            initial = await inspect(client)
            await propose(client, navy)
            survey = await start(client, "refuge-hull-survey", rules["hull_research"])
            surveyed = await finish(client, survey)
            assert node(surveyed, navy["id"], survey["node_id"])["status"] == "completed"
            assert rules["hull_research"]["capability"] in surveyed["capabilities"]
            # Project-clock advancement also moves a real route deterministically.
            sailing = await command(client, "move", {
                "fleet_id": "med-fleet", "destination": "alexandria",
            })

            accepted = await propose(client, reform)
            hearing = node(accepted, reform["id"], "harbor-worship-hearings")
            assert hearing["prerequisites"] == [survey["node_id"]]
            assert hearing["status"] == "available"
            assert hearing["icon"]["base"] == catalog["fallback"]
            assert hearing["icon"]["fallback_label"] == "harbor-many-faiths"

            # Reject both a novel mechanic and a forged award through the SDK.
            # Validation can fail at the SDK schema boundary, so inspect saved
            # state afterward rather than assuming all errors contain state.
            for label, mutation in (
                ("novel-mechanic", {"rule": "instant_divine_consensus"}),
                ("forged-outcome", {"effects": {"treasury": 999999}}),
            ):
                invalid = deepcopy(reform)
                invalid["id"] = label
                invalid["nodes"] = [deepcopy(reform["nodes"][0])]
                invalid["nodes"][0]["id"] = f"{label}-node"
                invalid["nodes"][0].update(mutation)
                before = await inspect(client)
                rejected = await client.call_tool("propose_development", {
                    "command_id": label, "expected_revision": before["revision"], "proposal": invalid,
                })
                assert rejected.is_error
                assert await inspect(client) == before

            hearings = await start(client, "harbor-worship-hearings", rules["consultation"])
            consulted = await finish(client, hearings)
            assert node(consulted, reform["id"], hearings["node_id"])["status"] == "completed"
            council = await start(client, "harbor-sanctuary-council", rules["institution"])
            saved = await finish(client, council)
            decision = next(d for d in saved["decisions"] if d["project_id"] == council["id"])
            assert not decision["resolved"]
            assert saved["paused"]
            assert item(saved, "projects", council["id"])["status"] == "awaiting_decision"
            assert not saved["institutions"]
            assert saved["politics"]["opposition"] > consulted["politics"]["opposition"]
            blocked = await client.call_tool("issue_order", {
                "command_id": "opposition-stops-time", "expected_revision": saved["revision"],
                "action": "clock", "payload": {"mode": "next_event"},
            })
            assert blocked.is_error
            assert blocked.structured_content["error"]["code"] == "decision_pending"
            assert await inspect(client) == saved
            saved_fleet = item(saved, "fleets", "med-fleet")
            assert saved_fleet["route"] is not None
            assert saved_fleet["position"] != item(sailing, "fleets", "med-fleet")["position"]
    finally:
        engine.close()

    # Reconnect a new SDK client to a new engine, not an old in-memory state.
    engine = Engine(path)
    try:
        async with Client(create_mcp(engine)) as client:
            resumed = await inspect(client)
            assert resumed == saved
            assert node(resumed, navy["id"], "refuge-hull-survey")["icon"]["base"] == approved_icon["id"]
            assert node(resumed, reform["id"], "harbor-worship-hearings")["icon"] == hearing["icon"]
            compromise = next(option for option in decision["options"] if option["id"] == "compromise")
            settled = await command(client, "resolve_decision", {
                "decision_id": decision["id"], "option_id": compromise["id"],
            })
            assert_payment(resumed, settled, compromise["costs"])
            assert settled["politics"]["opposition"] < resumed["politics"]["opposition"]
            assert settled["politics"]["legitimacy"] > resumed["politics"]["legitimacy"]
            assert item(settled, "decisions", decision["id"])["choice"] == compromise["id"]
            assert item(settled, "institutions", council["node_id"])["title"] == reform["nodes"][1]["title"]
            assert node(settled, reform["id"], council["node_id"])["status"] == "completed"
            route_preview = await call(client, "preview_order", {
                "action": "move", "payload": {"fleet_id": "med-fleet", "destination": "rome"},
            })
            assert route_preview["route"]["coordinates"][0] == pytest.approx(saved_fleet["position"], rel=0, abs=1e-12)
            rerouted = await command(client, "move", {
                "fleet_id": "med-fleet", "destination": "rome",
            })
            returning_fleet = item(rerouted, "fleets", "med-fleet")
            assert returning_fleet["position"] == pytest.approx(saved_fleet["position"], rel=0, abs=1e-12)
            assert returning_fleet["route"] == route_preview["route"]

            charter = await start(client, "harbor-observance-charter", rules["law"])
            contested = await finish(client, charter)
            law_decision = next(d for d in contested["decisions"] if d["project_id"] == charter["id"])
            assert not contested["laws"]
            impose = next(option for option in law_decision["options"] if option["id"] == "impose")
            enacted = await command(client, "resolve_decision", {
                "decision_id": law_decision["id"], "option_id": impose["id"],
            })
            assert_payment(contested, enacted, impose["costs"])
            assert enacted["politics"]["opposition"] > contested["politics"]["opposition"]
            assert enacted["politics"]["legitimacy"] < contested["politics"]["legitimacy"]
            assert item(enacted, "laws", charter["node_id"])["title"] == reform["nodes"][2]["title"]

            yard = await start(client, "refuge-repair-yard", rules["shipyard"])
            final = await finish(client, yard)
            assert rules["shipyard"]["facility"] in item(final, "ports", "berenike")["facilities"]
            assert all(n["status"] == "completed" for tree in final["trees"] for n in tree["nodes"])
            assert all(d["resolved"] for d in final["decisions"])
            assert final["resources"]["treasury"] < initial["resources"]["treasury"]
            # Neither generated ambition may silently award a fleet.
            assert [(f["id"], f["ships"], f["kind"]) for f in final["fleets"]] == [
                (f["id"], f["ships"], f["kind"]) for f in initial["fleets"]
            ]
    finally:
        engine.close()

    engine = Engine(path)
    try:
        async with Client(create_mcp(engine)) as client:
            assert await inspect(client) == final
    finally:
        engine.close()
