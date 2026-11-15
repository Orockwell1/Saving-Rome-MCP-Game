"""Deterministic public-interface regression tests; no network or model required."""
from copy import deepcopy
from itertools import count

import pytest

from rome.engine import Engine, GameError
from rome.models import TreeProposal
from rome.rules import RULES, naval_proposal


@pytest.fixture
def engine(tmp_path, monkeypatch):
    monkeypatch.setattr("rome.engine.time.monotonic", lambda: 1000.0)
    campaign = Engine(tmp_path / "campaign.sqlite")
    yield campaign
    campaign.close()


@pytest.fixture
def order():
    identifiers = count()

    def issue(engine, action, payload=None, **overrides):
        command = {"command_id": f"test-{next(identifiers)}", "expected_revision": engine.snapshot()["revision"],
                   "action": action, "payload": payload or {}}
        command.update(overrides)
        return engine.command(command)

    return issue


def proposal(identifier="novel-faith", rules=("consultation", "institution", "law"), location="rome"):
    return {"id": identifier, "title": "The Concord of Open Sanctuaries", "ambition": "Reconcile distinct religious communities through a new civic institution",
            "version": 1, "provenance": {"author": "A previously unauthored player ambition", "version": "1"},
            "nodes": [{"id": f"{identifier}-{index}", "title": f"Novel sanctuary stage {index}",
                       "description": "An affected community proposes a specific named reform.", "rule": rule,
                       "location_id": location, "prerequisites": [f"{identifier}-{index - 1}"] if index else [],
                       "icon": {"base": "faith", "badge": "assembly", "variant": "burgundy", "seed": index},
                       "scope": "Local sanctuary and civic relations", "people": ["temple custodians", "residents"]}
                      for index, rule in enumerate(rules)]}


def accept(engine, order, tree):
    order(engine, "propose_tree", {"proposal": tree})
    order(engine, "accept_tree", {"tree_id": tree["id"]})


def item(state, collection, identifier):
    return next(value for value in state[collection] if value["id"] == identifier)


def advance_to_dock(engine, order, fleet_id, destination):
    # Expiry is itself an event, so next_event must not pretend it is arrival.
    for _ in range(12):
        fleet = item(engine.snapshot(), "fleets", fleet_id)
        if fleet["port_id"] == destination:
            return
        order(engine, "clock", {"mode": "next_event"})
    pytest.fail("Fleet never reached its scheduled destination")


def test_initial_snapshot_and_previews_are_read_only(engine):
    before = engine.snapshot()
    assert before["paused"] and before["year"] == 210
    assert before["day"] == 0
    assert len(before["ports"]) == 10
    engine.preview("move", {"fleet_id": "red-fleet", "destination": "panyu"})
    engine.preview("rules", {})
    engine.preview("tutorial", {})
    engine.tick(5)
    assert engine.snapshot() == before
    before["resources"]["treasury"] = 999999
    assert engine.snapshot()["resources"]["treasury"] == 5000


def test_idempotency_stale_revision_and_no_double_spending(engine, order):
    accept(engine, order, proposal(rules=("research",)))
    revision = engine.snapshot()["revision"]
    command = {"command_id": "paid-once", "expected_revision": revision,
               "action": "start_project", "payload": {"node_id": "novel-faith-0"}}
    result = engine.command(command)
    assert engine.command(command) == result
    assert engine.snapshot()["resources"]["treasury"] == 4930
    assert len(engine.snapshot()["projects"]) == 1
    changed = deepcopy(command)
    changed["payload"]["node_id"] = "other"
    with pytest.raises(GameError, match="different content"):
        engine.command(changed)
    with pytest.raises(GameError) as stale:
        order(engine, "heartbeat", expected_revision=revision)
    assert stale.value.code == "stale_revision"
    with pytest.raises(GameError) as duplicate:
        order(engine, "start_project", {"node_id": "novel-faith-0"})
    assert duplicate.value.code == "project_blocked"
    assert engine.snapshot()["resources"]["treasury"] == 4930


def test_restart_preserves_definitions_routes_projects_and_command_receipts(tmp_path, order, monkeypatch):
    monkeypatch.setattr("rome.engine.time.monotonic", lambda: 1000.0)
    path = tmp_path / "restart.sqlite"
    first = Engine(path)
    tree = proposal(rules=("research",))
    accept(first, order, tree)
    order(first, "start_project", {"node_id": "novel-faith-0"})
    command = {"command_id": "persisted-move", "expected_revision": first.snapshot()["revision"],
               "action": "move", "payload": {"fleet_id": "red-fleet", "destination": "panyu"}}
    receipt = first.command(command)
    order(first, "heartbeat")
    order(first, "clock", {"mode": "resume"})
    first.tick(1)
    saved = first.snapshot()
    first.close()
    second = Engine(path)
    try:
        resumed = second.snapshot()
        assert resumed["paused"]
        assert resumed["day"] == saved["day"]
        assert resumed["trees"] == saved["trees"]
        assert resumed["projects"] == saved["projects"]
        assert resumed["fleets"] == saved["fleets"]
        assert second.command(command) == receipt
        second.tick(5000)
        assert second.snapshot()["day"] == saved["day"]
        with pytest.raises(GameError) as no_lease:
            order(second, "clock", {"mode": "resume"})
        assert no_lease.value.code == "lease_required"
    finally:
        second.close()


def test_backup_contains_campaign_and_idempotency(engine, tmp_path, order):
    command = {"command_id": "backup-command", "expected_revision": 0, "action": "tutorial", "payload": {"mode": "skip"}}
    receipt = engine.command(command)
    backup_path = tmp_path / "backup.sqlite"
    engine.backup(backup_path)
    backup = Engine(backup_path)
    try:
        assert backup.snapshot() == engine.snapshot()
        assert backup.command(command) == receipt
    finally:
        backup.close()
    with pytest.raises(GameError):
        engine.backup(engine.path)


def test_atomic_failed_transfer_does_not_spend(engine, order):
    before = engine.snapshot()
    with pytest.raises(GameError) as error:
        order(engine, "transfer_cargo", {"from_port": "berenike", "to_port": "alexandria", "cargo": {"plants": 8}})
    assert error.value.code == "insufficient_cargo"
    assert engine.snapshot() == before


def test_multiple_connections_cannot_commit_same_revision(tmp_path):
    path = tmp_path / "shared.sqlite"
    first, second = Engine(path), Engine(path)
    try:
        first.command({"command_id": "first", "expected_revision": 0, "action": "tutorial", "payload": {"mode": "skip"}})
        with pytest.raises(GameError) as stale:
            second.command({"command_id": "second", "expected_revision": 0, "action": "heartbeat", "payload": {}})
        assert stale.value.code == "stale_revision"
        assert second.snapshot()["tutorial"] == "skipped"
    finally:
        first.close()
        second.close()


def test_clock_frames_and_heartbeats_do_not_invalidate_player_orders(engine, order):
    order(engine, "heartbeat")
    order(engine, "clock", {"mode": "resume"})
    observed_revision = engine.snapshot()["revision"]
    engine.tick(1)
    order(engine, "heartbeat", expected_revision=observed_revision)
    assert engine.snapshot()["revision"] > observed_revision
    stopped = order(engine, "clock", {"mode": "pause"}, expected_revision=observed_revision)["state"]
    assert stopped["paused"] and stopped["day"] == 1
    with pytest.raises(GameError) as stale:
        order(engine, "clock", {"mode": "resume"}, expected_revision=observed_revision)
    assert stale.value.code == "stale_revision"


def test_live_lease_clamps_and_pauses_without_offline_time(engine, order):
    with pytest.raises(GameError):
        order(engine, "clock", {"mode": "resume"})
    order(engine, "heartbeat")
    order(engine, "clock", {"mode": "resume"})
    engine.tick(300)
    state = engine.snapshot()
    assert state["day"] == 120
    assert state["paused"]
    revision = state["revision"]
    engine.tick(300)
    assert engine.snapshot()["revision"] == revision
    order(engine, "heartbeat")
    order(engine, "clock", {"mode": "speed", "speed": 5})
    order(engine, "clock", {"mode": "resume"})
    engine.tick(2)
    assert engine.snapshot()["day"] == 130


def test_late_tick_resolves_only_active_part_of_lease(engine, order, monkeypatch):
    order(engine, "heartbeat")
    order(engine, "clock", {"mode": "resume"})
    monkeypatch.setattr("rome.engine.time.monotonic", lambda: 1150.0)
    engine.tick(150)
    assert engine.snapshot()["day"] == 120
    assert engine.snapshot()["paused"]
    order(engine, "heartbeat")
    order(engine, "clock", {"mode": "resume"})
    monkeypatch.setattr("rome.engine.time.monotonic", lambda: 2000.0)
    engine.tick(1)
    assert engine.snapshot()["day"] == 120


def test_repeated_reroutes_keep_exact_position_and_correct_eta(engine, order):
    order(engine, "move", {"fleet_id": "med-fleet", "destination": "alexandria"})
    order(engine, "heartbeat")
    order(engine, "clock", {"mode": "resume"})
    engine.tick(2)
    before = item(engine.snapshot(), "fleets", "med-fleet")
    preview = engine.preview("move", {"fleet_id": "med-fleet", "destination": "rome"})
    assert preview["route"]["coordinates"][0] == pytest.approx(before["position"])
    result = order(engine, "move", {"fleet_id": "med-fleet", "destination": "rome"})
    assert item(result["state"], "fleets", "med-fleet")["position"] == pytest.approx(before["position"])
    assert preview["route"]["arrival_day"] == pytest.approx(4)
    assert "Previous ETA" in result["message"]
    engine.tick(1)
    before = item(engine.snapshot(), "fleets", "med-fleet")
    result = order(engine, "move", {"fleet_id": "med-fleet", "destination": "alexandria"})
    rerouted = item(result["state"], "fleets", "med-fleet")
    assert rerouted["position"] == pytest.approx(before["position"])
    assert rerouted["route"]["arrival_day"] == pytest.approx(18)
    advance_to_dock(engine, order, "med-fleet", "alexandria")
    assert item(engine.snapshot(), "fleets", "med-fleet")["position"] == [29.88, 31.20]


def test_no_suez_and_roman_asian_contact(engine, order):
    with pytest.raises(GameError) as blocked:
        order(engine, "move", {"fleet_id": "med-fleet", "destination": "berenike"})
    assert blocked.value.code == "no_sea_route"
    result = order(engine, "expedition", {"mode": "outbound", "fleet_id": "red-fleet"})
    fleet = item(result["state"], "fleets", "red-fleet")
    assert fleet["kind"] == "roman"
    assert fleet["route"]["destination"] == "panyu"
    assert len(fleet["route"]["legs"]) == 6
    assert all(leg["link_id"] != "egypt-transfer" for leg in fleet["route"]["legs"])
    for port in result["state"]["ports"]:
        assert -20 <= port["position"][0] <= 180


def test_generated_religious_institution_executes_and_stops_for_decisions(engine, order):
    tree = proposal()
    accept(engine, order, tree)
    order(engine, "set_mandate", {"id": "sanctuary-mandate", "title": "Fund the Concord",
                                  "tree_id": tree["id"], "budget": 300, "enabled": True})
    result = order(engine, "clock", {"mode": "until_project", "node_id": "novel-faith-2"})
    state = result["state"]
    assert state["day"] == 8
    assert state["paused"]
    assert len(state["projects"]) == 2
    assert state["institutions"] == []
    decision = state["decisions"][0]
    assert not decision["resolved"]
    with pytest.raises(GameError) as pending:
        order(engine, "clock", {"mode": "next_event"})
    assert pending.value.code == "decision_pending"
    original = engine.snapshot()
    with pytest.raises(GameError):
        order(engine, "resolve_decision", {"decision_id": decision["id"], "option_id": "invent_free_reform"})
    assert engine.snapshot() == original
    order(engine, "resolve_decision", {"decision_id": decision["id"], "option_id": "compromise"})
    state = engine.snapshot()
    assert state["institutions"][0]["title"] == tree["nodes"][1]["title"]
    assert state["institutions"][0]["people"] == tree["nodes"][1]["people"]
    assert state["mandates"][0]["spent"] == 300
    assert state["resources"]["treasury"] == 4660
    assert state["politics"]["legitimacy"] == 62
    order(engine, "clock", {"mode": "until_project", "node_id": "novel-faith-2"})
    law_decision = engine.snapshot()["decisions"][-1]
    order(engine, "resolve_decision", {"decision_id": law_decision["id"], "option_id": "impose"})
    assert engine.snapshot()["laws"][0]["title"] == tree["nodes"][2]["title"]
    assert engine.snapshot()["politics"]["legitimacy"] == 54
    with pytest.raises(GameError) as twice:
        order(engine, "resolve_decision", {"decision_id": law_decision["id"], "option_id": "compromise"})
    assert twice.value.code == "decision_resolved"


def test_mandate_budget_cannot_reset_spending_or_escape_scope(engine, order):
    tree = proposal(rules=("research", "research"))
    accept(engine, order, tree)
    mandate = {"id": "bounded", "title": "Only one study", "tree_id": tree["id"], "budget": 70, "enabled": True}
    order(engine, "set_mandate", mandate)
    order(engine, "clock", {"mode": "next_event"})
    assert len(engine.snapshot()["projects"]) == 1
    order(engine, "set_mandate", mandate)
    assert len(engine.snapshot()["projects"]) == 1
    assert engine.snapshot()["mandates"][0]["spent"] == 70
    with pytest.raises(GameError):
        order(engine, "set_mandate", {**mandate, "budget": 0})
    other = proposal("other-goal", rules=("research",))
    accept(engine, order, other)
    with pytest.raises(GameError) as scope:
        order(engine, "set_mandate", {**mandate, "tree_id": other["id"]})
    assert scope.value.code == "mandate_scope"


def test_tutorial_pays_every_project_and_builds_local_maintainable_fleet(engine, order):
    initial = engine.snapshot()
    order(engine, "tutorial", {"mode": "start"})
    assert len(engine.snapshot()["fleets"]) == len(initial["fleets"])
    preview = engine.preview("project", {"node_id": "naval-operational_fleet"})
    assert any("facility" in blocker for blocker in preview["blockers"])
    result = order(engine, "clock", {"mode": "until_project", "node_id": "naval-operational_fleet"})
    state = result["state"]
    assert len(state["projects"]) == 11
    assert all(project["status"] == "completed" for project in state["projects"])
    cost = sum(RULES[node["rule"]]["costs"].get("treasury", 0) for node in naval_proposal()["nodes"])
    assert state["resources"]["treasury"] == 5000 - cost
    assert state["mandates"][0]["spent"] == cost <= state["mandates"][0]["budget"]
    fleet = item(state, "fleets", "fleet-naval-operational_fleet")
    assert fleet["kind"] == "advanced" and fleet["ships"] == 3
    assert fleet["maintenance_base"] == "berenike"
    port = item(state, "ports", "berenike")
    assert "advanced_shipyard" in port["facilities"] and "trained_crews" in port["facilities"]
    assert "advanced_shipyard" not in item(state, "ports", "rome")["facilities"]
    assert all(value >= 0 for value in port["inventory"].values())
    assert "blue_water_navy" in state["capabilities"]
    assert state["tutorial"] == "expedition_ready"


def test_capacity_and_knowledge_are_not_manufacturing(engine, order):
    tree = proposal(rules=("research", "research", "research"))
    for node in tree["nodes"]:
        node["prerequisites"] = []
    accept(engine, order, tree)
    order(engine, "start_project", {"node_id": "novel-faith-0"})
    order(engine, "start_project", {"node_id": "novel-faith-1"})
    before = engine.snapshot()
    with pytest.raises(GameError, match="capacity"):
        order(engine, "start_project", {"node_id": "novel-faith-2"})
    assert engine.snapshot() == before
    fake_fleet = proposal("instant-navy", rules=("operational_fleet",))
    accept(engine, order, fake_fleet)
    with pytest.raises(GameError, match="Missing knowledge"):
        order(engine, "start_project", {"node_id": "instant-navy-0"})


def test_expediton_return_transfer_and_cultivation_are_real(engine, order):
    order(engine, "expedition", {"mode": "outbound", "fleet_id": "red-fleet"})
    advance_to_dock(engine, order, "red-fleet", "panyu")
    decision = engine.snapshot()["decisions"][-1]
    assert not decision["resolved"]
    order(engine, "resolve_decision", {"decision_id": decision["id"], "option_id": "trade"})
    fleet = item(engine.snapshot(), "fleets", "red-fleet")
    plants_deadline = next(lot["expires_day"] for lot in fleet["cargo_lots"] if lot["kind"] == "plants")
    order(engine, "expedition", {"mode": "return", "fleet_id": "red-fleet"})
    order(engine, "move", {"fleet_id": "med-fleet", "destination": "alexandria"})
    advance_to_dock(engine, order, "red-fleet", "berenike")
    fleet = item(engine.snapshot(), "fleets", "red-fleet")
    assert fleet["cargo"]["fruit"] == 0
    assert fleet["cargo"]["plants"] == 8
    order(engine, "cargo", {"fleet_id": "red-fleet", "mode": "unload", "cargo": {"plants": 8}})
    order(engine, "transfer_cargo", {"from_port": "berenike", "to_port": "alexandria", "cargo": {"plants": 8}})
    assert item(engine.snapshot(), "ports", "alexandria")["inventory"].get("plants", 0) == 0
    order(engine, "clock", {"mode": "next_event"})
    assert item(engine.snapshot(), "ports", "alexandria")["inventory"]["plants"] == 8
    order(engine, "cargo", {"fleet_id": "med-fleet", "mode": "load", "cargo": {"plants": 8}})
    carried = item(engine.snapshot(), "fleets", "med-fleet")["cargo_lots"]
    assert carried[0]["expires_day"] == plants_deadline
    order(engine, "move", {"fleet_id": "med-fleet", "destination": "rome"})
    advance_to_dock(engine, order, "med-fleet", "rome")
    order(engine, "cargo", {"fleet_id": "med-fleet", "mode": "unload", "cargo": {"plants": 8}})
    assert "citrus_acclimatization" in engine.snapshot()["capabilities"]
    assert "citrus_cultivation" not in engine.snapshot()["capabilities"]
    garden = proposal("palatine-citrus", rules=("cultivation",))
    accept(engine, order, garden)
    order(engine, "start_project", {"node_id": "palatine-citrus-0"})
    order(engine, "clock", {"mode": "until_project", "node_id": "palatine-citrus-0"})
    state = engine.snapshot()
    assert item(state, "ports", "rome")["inventory"]["fruit"] == 10
    assert "citrus_cultivation" in state["capabilities"]
    assert "citrus_garden" in item(state, "ports", "rome")["facilities"]
    assert item(state, "fleets", "red-fleet")["port_id"] == "berenike"


@pytest.mark.parametrize("mutation,code", [
    (lambda tree: tree["nodes"][0].update(effects={"treasury": 999999}), "invalid_command"),
    (lambda tree: tree["nodes"][0].update(costs={"treasury": -100}), "invalid_command"),
    (lambda tree: tree["nodes"][0].update(duration=0), "invalid_command"),
    (lambda tree: tree["nodes"][0].update(rule="magic_resources"), "unsupported_rule"),
    (lambda tree: tree["nodes"][0].update(location_id="america"), "not_found"),
    (lambda tree: tree["nodes"][0].update(prerequisites=["missing"]), "unknown_prerequisite"),
    (lambda tree: tree["nodes"][0].update(prerequisites=["novel-faith-2"]), "dependency_cycle"),
    (lambda tree: tree["nodes"][1].update(id="novel-faith-0"), "duplicate_node"),
    (lambda tree: tree.update(version=2), "invalid_command"),
    (lambda tree: tree["nodes"][0].update(icon={"base": "<svg onload=alert(1)>"}), "invalid_command"),
    (lambda tree: tree["nodes"][0].update(icon={"base": "https://example.org/icon"}), "invalid_command"),
])
def test_generated_definition_forgery_rejected_atomically(engine, order, mutation, code):
    tree = proposal()
    mutation(tree)
    before = engine.snapshot()
    with pytest.raises(GameError) as rejected:
        order(engine, "propose_tree", {"proposal": tree})
    assert rejected.value.code == code
    assert engine.snapshot() == before


def test_unknown_icon_fallback_and_immutable_provenance_survive(engine, order):
    tree = proposal(rules=("research", "research"))
    tree["nodes"][0]["icon"]["base"] = "not-yet-drawn-symbol"
    tree["nodes"][1]["icon"] = {"base": "blue-water-fleet", "badge": "unregistered-badge"}
    accept(engine, order, tree)
    saved = engine.snapshot()["trees"][0]
    assert saved["nodes"][0]["icon"]["base"] == "generic"
    assert saved["nodes"][0]["icon"]["fallback_label"] == "not-yet-drawn-symbol"
    assert saved["nodes"][1]["icon"]["base"] == "blue-water-fleet"
    assert saved["nodes"][1]["icon"]["fallback_label"] == "badge:unregistered-badge"
    assert "badge" not in saved["nodes"][1]["icon"]
    assert len(saved["provenance"]["hash"]) == 64
    assert saved["provenance"]["author"] == tree["provenance"]["author"]
    with pytest.raises(GameError) as duplicate:
        order(engine, "propose_tree", {"proposal": tree})
    assert duplicate.value.code == "duplicate_tree"


def test_campaign_prerequisites_and_full_node_limit(engine, order):
    first = proposal("prior-study", rules=("research",))
    accept(engine, order, first)
    order(engine, "start_project", {"node_id": "prior-study-0"})
    second = proposal("large-ambition", rules=("research",) * 500)
    second["nodes"][0]["prerequisites"] = ["prior-study-0"]
    accept(engine, order, second)
    assert len(engine.snapshot()["trees"][1]["nodes"]) == 500
    with pytest.raises(GameError, match="Prerequisite incomplete"):
        order(engine, "start_project", {"node_id": "large-ambition-0"})
    order(engine, "clock", {"mode": "next_event"})
    order(engine, "start_project", {"node_id": "large-ambition-0"})
    oversized = proposal("too-large", rules=("research",) * 501)
    with pytest.raises(GameError) as error:
        order(engine, "propose_tree", {"proposal": oversized})
    assert error.value.code == "invalid_command"


def test_public_schema_and_reject_nonstrict_command_fields(engine):
    schema = TreeProposal.model_json_schema()
    assert schema["additionalProperties"] is False
    assert schema["properties"]["nodes"]["maxItems"] == 500
    for revision in ("0", True, 0.5):
        with pytest.raises(GameError):
            engine.command({"command_id": "bad-revision", "expected_revision": revision, "action": "heartbeat", "payload": {}})
    for elapsed in (float("nan"), float("inf"), -1, True):
        with pytest.raises(GameError):
            engine.tick(elapsed)


def test_live_tick_stops_at_decision_and_never_skips_intervening_events(engine, order):
    tree = proposal(rules=("consultation", "institution"))
    accept(engine, order, tree)
    order(engine, "set_mandate", {"id": "live-reform", "title": "A debated charter",
                                  "tree_id": tree["id"], "budget": 200, "enabled": True})
    order(engine, "heartbeat")
    order(engine, "clock", {"mode": "resume"})
    engine.tick(100)
    state = engine.snapshot()
    assert state["day"] == 8
    assert state["paused"]
    assert state["projects"][0]["status"] == "completed"
    assert state["projects"][1]["status"] == "awaiting_decision"
    assert state["trees"][0]["nodes"][1]["status"] == "blocked"
    assert state["trees"][0]["nodes"][1]["blockers"]
    engine.tick(10)
    assert engine.snapshot()["day"] == 8


def test_proposal_versions_and_speeds_reject_boolean_and_string_coercion(engine, order):
    for version in (True, "1", 1.0):
        tree = proposal()
        tree["version"] = version
        with pytest.raises(GameError) as rejected:
            order(engine, "propose_tree", {"proposal": tree})
        assert rejected.value.code == "invalid_command"
    for speed in (True, "5", 5.0):
        with pytest.raises(GameError):
            order(engine, "clock", {"mode": "speed", "speed": speed})


def test_skip_does_not_grant_advanced_capabilities_or_tutorial_costs(engine, order):
    before = engine.snapshot()
    state = order(engine, "tutorial", {"mode": "skip"})["state"]
    assert state["resources"] == before["resources"]
    assert state["fleets"] == before["fleets"]
    assert state["capabilities"] == ["roman_seafaring"]
    assert not state["mandates"] and not state["trees"]


def test_budget_and_global_workforce_bound_parallel_projects(engine, order):
    tree = proposal("many-workshops", rules=("research",) * 8)
    locations = ["rome", "carthage", "alexandria", "berenike"]
    for index, node in enumerate(tree["nodes"]):
        node["prerequisites"] = []
        node["location_id"] = locations[index // 2]
    accept(engine, order, tree)
    for index in range(6):
        order(engine, "start_project", {"node_id": f"many-workshops-{index}"})
    before = engine.snapshot()
    with pytest.raises(GameError, match="workforce"):
        order(engine, "start_project", {"node_id": "many-workshops-6"})
    assert engine.snapshot() == before
