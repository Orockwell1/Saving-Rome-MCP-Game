"""Authoritative transactional campaign simulation, independent of HTTP and UI."""
from __future__ import annotations

import hashlib
import heapq
import json
import math
import sqlite3
import threading
import time
from copy import deepcopy
from pathlib import Path

from pydantic import ValidationError

from .models import Command, PAYLOADS, TreeProposal
from .rules import ICON_BADGES, ICON_BASES, RULES, catalog, naval_proposal
from .world import initial_state


class GameError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def interpolate(points, fraction):
    """Interpolate along a polyline, not directly through intervening coastlines."""
    if fraction <= 0:
        return list(points[0])
    if fraction >= 1:
        return list(points[-1])
    lengths = [math.dist(a, b) for a, b in zip(points, points[1:])]
    remaining = sum(lengths) * fraction
    for a, b, length in zip(points, points[1:], lengths):
        if remaining <= length and length:
            f = remaining / length
            return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
        remaining -= length
    return list(points[-1])


def remaining_polyline(points, fraction):
    if fraction <= 0:
        return deepcopy(points)
    position = interpolate(points, fraction)
    distance = sum(math.dist(a, b) for a, b in zip(points, points[1:])) * fraction
    for index, (a, b) in enumerate(zip(points, points[1:])):
        length = math.dist(a, b)
        if distance < length:
            return [position, *deepcopy(points[index + 1:])]
        distance -= length
    return [position, list(points[-1])]


class Engine:
    def __init__(self, path: str | Path):
        self.path = str(path)
        if self.path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._db = sqlite3.connect(self.path, isolation_level=None, check_same_thread=False, timeout=10)
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.execute("PRAGMA synchronous=FULL")
        self._db.execute("CREATE TABLE IF NOT EXISTS campaign (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL)")
        self._db.execute("CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, request TEXT NOT NULL, result TEXT NOT NULL)")
        self._lease_remaining = 0.0
        self._lease_deadline = 0.0
        self._db.execute("BEGIN IMMEDIATE")
        try:
            row = self._db.execute("SELECT state FROM campaign WHERE id=1").fetchone()
            self._state = json.loads(row[0]) if row else initial_state()
            if self._state["version"] != 1:
                raise GameError("save_version", "Unsupported campaign save version.")
            self._state.setdefault("last_order_revision", self._state["revision"])
            if not self._state["paused"]:
                self._state["paused"] = True
                self._state["revision"] += 1
                self._state["last_order_revision"] = self._state["revision"]
                self._dispatch("session", "Campaign resumed safely", "Service restarted: paused without advancing offline time.")
            self._save()
            self._db.execute("COMMIT")
        except BaseException:
            self._db.execute("ROLLBACK")
            self._db.close()
            raise

    def _load(self):
        self._state = json.loads(self._db.execute("SELECT state FROM campaign WHERE id=1").fetchone()[0])

    def _save(self):
        self._db.execute("INSERT INTO campaign(id,state) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state", (encoded(self._state),))

    def close(self):
        with self._lock:
            self._db.close()

    def backup(self, destination: str | Path):
        if self.path != ":memory:" and Path(destination).resolve() == Path(self.path).resolve():
            raise GameError("backup_path", "Choose a backup destination different from the campaign.")
        Path(destination).parent.mkdir(parents=True, exist_ok=True)
        with self._lock, sqlite3.connect(str(destination)) as target:
            self._db.backup(target)

    def snapshot(self):
        with self._lock:
            self._load()
            return self._snapshot()

    def _snapshot(self):
        state = deepcopy(self._state)
        state["year"] = 210 + math.floor(state["day"] / 365)
        for tree in state["trees"]:
            for node in tree["nodes"]:
                project = self._project_for(node["id"])
                node["blockers"] = self._blockers(node, tree) if not project else []
                node["progress"] = 0.0
                if project:
                    node["status"] = "blocked" if project["status"] == "awaiting_decision" else project["status"]
                    if project["status"] == "awaiting_decision":
                        node["blockers"] = ["Consequential decision awaiting your choice"]
                    node["progress"] = self._progress(project)
                elif tree["status"] == "proposed":
                    node["status"] = "proposed"
                else:
                    node["status"] = "blocked" if node["blockers"] else "available"
        for project in state["projects"]:
            project["progress"] = self._progress(project)
        for fleet in state["fleets"]:
            fleet["position"] = self._fleet_position(fleet)
        return state

    def _progress(self, project):
        if project["status"] == "completed":
            return 1.0
        return min(1.0, max(0.0, (self._state["day"] - project["start_day"]) / (project["finish_day"] - project["start_day"])))

    def command(self, command: dict):
        try:
            envelope = Command.model_validate(command)
            if envelope.action not in PAYLOADS:
                raise GameError("unknown_action", f"Unsupported action: {envelope.action}")
            payload = PAYLOADS[envelope.action].model_validate(envelope.payload).model_dump(exclude_none=True)
            request = encoded(envelope.model_dump())
        except (ValidationError, ValueError, TypeError) as exc:
            raise GameError("invalid_command", str(exc)) from exc
        with self._lock:
            self._db.execute("BEGIN IMMEDIATE")
            lease = (self._lease_remaining, self._lease_deadline)
            try:
                previous = self._db.execute("SELECT request,result FROM commands WHERE id=?", (envelope.command_id,)).fetchone()
                if previous:
                    if previous[0] != request:
                        raise GameError("idempotency_conflict", "That command identifier was already used with different content.")
                    self._db.execute("COMMIT")
                    return json.loads(previous[1])
                self._load()
                # Clock frames and lease heartbeats must not invalidate a player's
                # observed order. Competing orders still conflict; every accepted
                # action revalidates its resources and targets against current state.
                if not self._state["last_order_revision"] <= envelope.expected_revision <= self._state["revision"]:
                    raise GameError("stale_revision", "Another order changed the campaign; inspect fresh state before issuing a new command.")
                message = self._apply(envelope.action, payload)
                self._run_mandates()
                self._state["revision"] += 1
                if envelope.action != "heartbeat":
                    self._state["last_order_revision"] = self._state["revision"]
                self._save()
                result = {"state": self._snapshot(), "message": message}
                self._db.execute("INSERT INTO commands(id,request,result) VALUES(?,?,?)", (envelope.command_id, request, encoded(result)))
                self._db.execute("COMMIT")
                return result
            except BaseException:
                self._db.execute("ROLLBACK")
                self._lease_remaining, self._lease_deadline = lease
                self._load()
                raise

    def preview(self, action: str, payload: dict):
        with self._lock:
            self._load()
            try:
                if action == "rules":
                    PAYLOADS["heartbeat"].model_validate(payload)
                    return catalog()
                if action == "tutorial":
                    PAYLOADS["heartbeat"].model_validate(payload)
                    return {"proposal": naval_proposal()}
                if action == "move":
                    order = PAYLOADS["move"].model_validate(payload)
                    route = self._route(self._get("fleets", order.fleet_id), order.destination)
                    return {"route": route, "message": self._route_message(route)}
                if action == "project":
                    order = PAYLOADS["start_project"].model_validate(payload)
                    tree, node = self._node(order.node_id)
                    return {"node_id": node["id"], "costs": deepcopy(node["costs"]),
                            "duration": node["duration"], "requirements": deepcopy(RULES[node["rule"]]),
                            "blockers": self._blockers(node, tree), "project": deepcopy(self._project_for(node["id"]))}
            except ValidationError as exc:
                raise GameError("invalid_preview", str(exc)) from exc
            raise GameError("unknown_preview", f"Unsupported preview: {action}")

    def tick(self, elapsed_seconds: float):
        if isinstance(elapsed_seconds, bool) or not isinstance(elapsed_seconds, (float, int)) or not math.isfinite(elapsed_seconds) or elapsed_seconds < 0:
            raise GameError("invalid_elapsed", "Elapsed seconds must be finite and nonnegative.")
        if elapsed_seconds == 0:
            return
        with self._lock:
            self._db.execute("BEGIN IMMEDIATE")
            try:
                self._load()
                before = encoded(self._state)
                # The supplied elapsed interval and wall deadline both constrain the lease.
                usable = min(float(elapsed_seconds), self._lease_remaining,
                             max(0.0, self._lease_deadline - (time.monotonic() - elapsed_seconds)))
                self._lease_remaining = max(0.0, self._lease_remaining - float(elapsed_seconds))
                if not self._state["paused"] and usable:
                    self._advance(self._state["day"] + usable * self._state["speed"])
                if not self._state["paused"] and (self._lease_remaining <= 0 or time.monotonic() >= self._lease_deadline):
                    self._state["paused"] = True
                    self._dispatch("session", "Session lease expired", "Clock paused after at most 120 seconds without a heartbeat.")
                if encoded(self._state) != before:
                    self._state["revision"] += 1
                    self._save()
                self._db.execute("COMMIT")
            except BaseException:
                self._db.execute("ROLLBACK")
                self._load()
                raise

    def _get(self, collection, identifier):
        for item in self._state[collection]:
            if item["id"] == identifier:
                return item
        raise GameError("not_found", f"Unknown {collection} identifier: {identifier}")

    def _node(self, identifier):
        for tree in self._state["trees"]:
            for node in tree["nodes"]:
                if node["id"] == identifier:
                    return tree, node
        raise GameError("not_found", f"Unknown node: {identifier}")

    def _project_for(self, identifier):
        return next((p for p in self._state["projects"] if p["node_id"] == identifier), None)

    def _dispatch(self, kind, title, detail):
        entries = self._state["chronicle"]
        entries.append({"id": f"dispatch-{len(entries) + 1}", "day": self._state["day"],
                        "kind": kind, "title": title, "detail": detail})

    def _unresolved(self):
        return any(not decision["resolved"] for decision in self._state["decisions"])

    def _apply(self, action, payload):
        if action == "heartbeat":
            self._lease_remaining = 120.0
            self._lease_deadline = time.monotonic() + 120.0
            return "Session lease renewed for 120 seconds; clock mode unchanged."
        if action == "propose_tree":
            return self._propose(payload["proposal"])
        if action == "accept_tree":
            return self._accept(payload["tree_id"])
        if action == "start_project":
            tree, node = self._node(payload["node_id"])
            self._start(tree, node)
            return f"Committed resources and started {node['title']}."
        if action == "move":
            return self._move(payload["fleet_id"], payload["destination"])
        if action == "clock":
            return self._clock(payload)
        if action == "resolve_decision":
            return self._resolve(payload["decision_id"], payload["option_id"])
        if action == "set_mandate":
            tree = self._get("trees", payload["tree_id"])
            if tree["status"] != "accepted":
                raise GameError("not_accepted", "Accept the tree before authorizing a mandate.")
            existing = next((m for m in self._state["mandates"] if m["id"] == payload["id"]), None)
            if existing and existing["tree_id"] != payload["tree_id"]:
                raise GameError("mandate_scope", "A mandate cannot be reassigned to another tree.")
            spent = existing["spent"] if existing else 0
            if payload["budget"] < spent:
                raise GameError("mandate_budget", "Budget cannot be less than already committed spending.")
            if existing:
                existing.update(payload)
            else:
                self._state["mandates"].append({**payload, "spent": 0})
            self._dispatch("mandate", payload["title"], f"Scoped to {tree['title']}; treasury ceiling {payload['budget']}; previous commitments {spent}.")
            return "Scoped mandate saved; consequential decisions still require your choice."
        if action == "tutorial":
            if self._state["tutorial"] != "not_started":
                raise GameError("tutorial_started", "Tutorial choice has already been made; existing commitments cannot be replaced.")
            if payload["mode"] == "skip":
                self._state["tutorial"] = "skipped"
                return "Tutorial skipped. Roman-era ships and free-form development remain available."
            proposal = naval_proposal()
            self._propose(proposal)
            self._accept(proposal["id"])
            self._state["mandates"].append({"id": "tutorial-budget", "title": "Develop the citrus expedition navy",
                                           "tree_id": proposal["id"], "budget": 1400, "spent": 0, "enabled": True})
            self._state["tutorial"] = "naval_development"
            return "Tutorial accepted with a visible 1,400 treasury ceiling; no vessels granted for free."
        if action == "select":
            collections = {"fleet": "fleets", "port": "ports", "territory": "territories"}
            if payload["kind"] == "node":
                self._node(payload["id"])
            else:
                self._get(collections[payload["kind"]], payload["id"])
            self._state["selection"] = payload
            return "Selection updated for the workspace and steward."
        if action == "expedition":
            fleet = self._get("fleets", payload["fleet_id"])
            destination = "panyu" if payload["mode"] == "outbound" else "berenike"
            if fleet["route"] or not fleet["port_id"]:
                raise GameError("expedition_docked", "Dock before provisioning an expedition.")
            port = self._get("ports", fleet["port_id"])
            if port["sea"] != "eastern":
                raise GameError("no_sea_route", "Mediterranean ships cannot cross Egypt. Use a Red Sea fleet.")
            if fleet["port_id"] == destination:
                raise GameError("already_there", "The fleet is already at the expedition destination.")
            self._spend({"food": 40, "treasury": 30})
            fleet["expedition"] = payload["mode"]
            return self._move(fleet["id"], destination)
        if action == "cargo":
            return self._cargo(payload)
        if action == "transfer_cargo":
            return self._transfer(payload)
        raise GameError("unknown_action", action)

    def _propose(self, proposal):
        proposal = TreeProposal.model_validate(proposal).model_dump(exclude_none=True)
        if any(t["id"] == proposal["id"] for t in self._state["trees"]):
            raise GameError("duplicate_tree", "Tree identifiers are immutable; use a new identifier for a new proposal.")
        existing = {n["id"] for t in self._state["trees"] for n in t["nodes"]}
        nodes = proposal["nodes"]
        ids = [n["id"] for n in nodes]
        if len(ids) != len(set(ids)) or existing.intersection(ids):
            raise GameError("duplicate_node", "Node identifiers must be unique across the campaign.")
        available = existing | set(ids)
        graph = {n["id"]: n["prerequisites"] for n in nodes}
        for node in nodes:
            if node["rule"] not in RULES:
                raise GameError("unsupported_rule", f"Unsupported mechanic {node['rule']}; use the rule catalog or request implementation.")
            self._get("ports", node["location_id"])
            if any(dep not in available for dep in node["prerequisites"]):
                raise GameError("unknown_prerequisite", f"Unknown prerequisite for {node['id']}.")
            if len(set(node["prerequisites"])) != len(node["prerequisites"]):
                raise GameError("duplicate_prerequisite", f"Duplicate prerequisite for {node['id']}.")
        # Kahn's algorithm is bounded and safe for the full 500-node schema limit.
        pending = {key: {dep for dep in deps if dep in graph} for key, deps in graph.items()}
        ready = [key for key, deps in pending.items() if not deps]
        visited = set()
        while ready:
            key = ready.pop()
            if key in visited:
                continue
            visited.add(key)
            for child, deps in pending.items():
                if key in deps:
                    deps.remove(key)
                    if not deps:
                        ready.append(child)
        if len(visited) != len(nodes):
            raise GameError("dependency_cycle", "Development prerequisites contain a cycle.")
        digest = hashlib.sha256(encoded(proposal).encode()).hexdigest()
        for node in nodes:
            if node["icon"]["base"] not in ICON_BASES:
                node["icon"]["fallback_label"] = node["icon"]["base"]
                node["icon"]["base"] = "generic"
            if node["icon"].get("badge") and node["icon"]["badge"] not in ICON_BADGES:
                missing = f"badge:{node['icon'].pop('badge')}"
                node["icon"]["fallback_label"] = ", ".join(filter(None, [node["icon"].get("fallback_label"), missing]))
            spec = RULES[node["rule"]]
            node.update(costs=deepcopy(spec["costs"]), duration=spec["duration"], progress=0,
                        status="proposed", blockers=[])
        proposal["provenance"]["hash"] = digest
        proposal["status"] = "proposed"
        self._state["trees"].append(proposal)
        self._dispatch("proposal", proposal["title"], f"Validated {len(nodes)} nodes; source hash {digest}. No resources committed.")
        return "Development proposal validated and saved; acceptance does not automatically authorize spending."

    def _accept(self, identifier):
        tree = self._get("trees", identifier)
        if tree["status"] != "proposed":
            raise GameError("already_accepted", "This tree is already accepted.")
        tree["status"] = "accepted"
        self._dispatch("acceptance", tree["title"], "Accepted immutable definitions; individual orders or a scoped mandate authorize projects.")
        return "Development tree accepted."

    def _blockers(self, node, tree):
        blockers = []
        if tree["status"] != "accepted":
            blockers.append("Tree has not been accepted")
        if self._project_for(node["id"]):
            blockers.append("Project already commissioned")
        for dep in node["prerequisites"]:
            project = self._project_for(dep)
            if not project or project["status"] != "completed":
                blockers.append(f"Prerequisite incomplete: {dep}")
        spec = RULES[node["rule"]]
        port = self._get("ports", node["location_id"])
        for capability in spec["requires"]:
            if capability not in self._state["capabilities"]:
                blockers.append(f"Missing knowledge: {capability}")
        for facility in spec["facilities"]:
            if facility not in port["facilities"]:
                blockers.append(f"Missing local facility at {port['name']}: {facility}")
        for resource, amount in spec["costs"].items():
            if self._state["resources"].get(resource, 0) < amount:
                blockers.append(f"Insufficient {resource}: need {amount}")
        for resource, amount in spec["inventory"].items():
            if port["inventory"].get(resource, 0) < amount:
                blockers.append(f"Missing local {resource} at {port['name']}: need {amount}")
        running = [p for p in self._state["projects"] if p["status"] == "underway"]
        workers = sum(RULES[self._node(p["node_id"])[1]["rule"]]["workers"] for p in running)
        if self._state["resources"]["workers"] - workers < spec["workers"]:
            blockers.append("Imperial workforce is fully committed")
        if sum(p["location_id"] == port["id"] for p in running) >= 2:
            blockers.append("Local workshop capacity: two simultaneous projects")
        return blockers

    def _spend(self, costs):
        for resource, amount in costs.items():
            if self._state["resources"].get(resource, 0) < amount:
                raise GameError("insufficient_resources", f"Need {amount} {resource}.")
        for resource, amount in costs.items():
            self._state["resources"][resource] -= amount

    def _start(self, tree, node, mandate=None):
        blockers = self._blockers(node, tree)
        if blockers:
            raise GameError("project_blocked", "; ".join(blockers))
        spec = RULES[node["rule"]]
        self._spend(spec["costs"])
        port = self._get("ports", node["location_id"])
        for resource, amount in spec["inventory"].items():
            port["inventory"][resource] -= amount
            if resource in ("fruit", "plants"):
                remaining = amount
                for lot in sorted(port["cargo_lots"], key=lambda lot: lot["expires_day"]):
                    if lot["kind"] == resource:
                        consumed = min(remaining, lot["quantity"])
                        lot["quantity"] -= consumed
                        remaining -= consumed
                port["cargo_lots"] = [lot for lot in port["cargo_lots"] if lot["quantity"]]
        project = {"id": f"project-{node['id']}", "node_id": node["id"], "tree_id": tree["id"],
                   "title": node["title"], "location_id": node["location_id"], "status": "underway",
                   "start_day": self._state["day"], "finish_day": self._state["day"] + spec["duration"],
                   "progress": 0.0, "costs_paid": deepcopy(spec["costs"]),
                   "local_inputs_paid": deepcopy(spec["inventory"])}
        self._state["projects"].append(project)
        if mandate:
            mandate["spent"] += spec["costs"].get("treasury", 0)
        self._dispatch("project", f"Started: {node['title']}", f"Finish day {project['finish_day']}; committed {encoded(spec['costs'])}." + (f" Authorized by {mandate['title']}." if mandate else " Direct order."))

    def _run_mandates(self):
        if self._unresolved():
            return
        for mandate in self._state["mandates"]:
            if not mandate["enabled"]:
                continue
            tree = self._get("trees", mandate["tree_id"])
            for node in tree["nodes"]:
                if self._project_for(node["id"]):
                    continue
                cost = RULES[node["rule"]]["costs"].get("treasury", 0)
                if mandate["spent"] + cost <= mandate["budget"] and not self._blockers(node, tree):
                    self._start(tree, node, mandate)

    def _complete(self, project):
        tree, node = self._node(project["node_id"])
        spec = RULES[node["rule"]]
        port = self._get("ports", node["location_id"])
        if spec["effect"] in ("institution", "law"):
            project["status"] = "awaiting_decision"
            decision_id = f"decision-{node['id']}"
            self._state["decisions"].append({"id": decision_id, "title": f"Settle {node['title']}",
                "description": "Affected groups contest the change. Compromise costs 40 treasury and builds legitimacy; impose it without payment at a greater opposition cost. Neither outcome is invented by the steward.",
                "project_id": project["id"], "kind": spec["effect"], "resolved": False,
                "options": [{"id": "compromise", "label": "Negotiate safeguards", "costs": {"treasury": 40}},
                            {"id": "impose", "label": "Impose by imperial authority", "costs": {}}]})
            self._state["politics"]["opposition"] = min(100, self._state["politics"]["opposition"] + 5)
            self._state["paused"] = True
            self._dispatch("decision", node["title"], "Consequential decision required; clock and routine mandates stopped.")
            return
        project["status"] = "completed"
        project["progress"] = 1.0
        self._effects(node, spec, port)
        self._dispatch("completion", node["title"], f"Completed at {port['name']}; paid inputs and workers produced the recorded rule outcomes.")

    def _effects(self, node, spec, port):
        if spec["capability"] and spec["capability"] not in self._state["capabilities"]:
            self._state["capabilities"].append(spec["capability"])
        if spec["facility"] and spec["facility"] not in port["facilities"]:
            port["facilities"].append(spec["facility"])
        for resource, amount in spec["supplies"].items():
            port["inventory"][resource] = port["inventory"].get(resource, 0) + amount
        if spec["effect"] == "harvest":
            self._add_lot(port, "fruit", 10, self._state["day"] + 30)
            self._dispatch("cultivation", "Protected citrus harvest", "Ten fresh fruit produced by a paid local cultivation project; harvest timing and acclimatization are compressed gameplay assumptions.")
        if spec["effect"] == "consultation":
            self._politics(support=5, opposition=-3, legitimacy=2)
        if spec["effect"] in ("trial", "fleet"):
            self._state["fleets"].append({"id": f"fleet-{node['id']}", "name": node["title"],
                "position": list(port["position"]), "port_id": port["id"], "kind": "advanced",
                "ships": 1 if spec["effect"] == "trial" else 3, "route": None, "cargo": {}, "cargo_lots": [],
                "maintenance_base": port["id"]})
            if spec["effect"] == "fleet" and self._state["tutorial"] == "naval_development":
                self._state["tutorial"] = "expedition_ready"
        if spec["effect"] in ("institution", "law"):
            collection = "institutions" if spec["effect"] == "institution" else "laws"
            self._state[collection].append({"id": node["id"], "title": node["title"], "scope": node["scope"],
                "people": node["people"], "location_id": node["location_id"], "enacted_day": self._state["day"],
                "rule": node["rule"]})

    def _politics(self, **changes):
        for field, delta in changes.items():
            self._state["politics"][field] = max(0, min(100, self._state["politics"][field] + delta))

    def _resolve(self, identifier, option_id):
        decision = self._get("decisions", identifier)
        if decision["resolved"]:
            raise GameError("decision_resolved", "This decision has already been resolved.")
        option = next((o for o in decision["options"] if o["id"] == option_id), None)
        if not option:
            raise GameError("unknown_option", "Choose one of the decision's recorded options.")
        self._spend(option["costs"])
        if decision["kind"] == "citrus":
            fleet = self._get("fleets", decision["fleet_id"])
            if fleet["port_id"] != "panyu":
                raise GameError("fleet_not_present", "Return the expedition fleet to Panyu before resolving its trade decision.")
            if option_id == "trade":
                # Local assumed harvest: first and last quarters of a 365-day game year.
                harvest = self._state["day"] % 365 < 90 or self._state["day"] % 365 >= 275
                fruit = 30 if harvest else 12
                capacity = fleet["ships"] * (60 if fleet["kind"] == "advanced" else 25)
                if sum(fleet["cargo"].values()) + fruit + 8 > capacity:
                    raise GameError("cargo_capacity", "Unload existing cargo before purchasing this citrus shipment.")
                self._add_lot(fleet, "fruit", fruit, self._state["day"] + 30)
                self._add_lot(fleet, "plants", 8, self._state["day"] + (240 if fleet["kind"] == "advanced" else 150))
                decision["outcome"] = {"fruit": fruit, "plants": 8, "harvest_season": harvest}
                self._dispatch("trade", "Citrus acquired", "Fresh fruit lasts 30 days; watered plants last 150 days on Roman ships or 240 on advanced ships. These are gameplay assumptions, not guarantees.")
        else:
            project = self._get("projects", decision["project_id"])
            _, node = self._node(project["node_id"])
            if option_id == "compromise":
                self._politics(support=8, opposition=-5, legitimacy=5)
            else:
                self._politics(support=2, opposition=12, legitimacy=-8)
            self._effects(node, RULES[node["rule"]], self._get("ports", node["location_id"]))
            project["status"] = "completed"
            project["progress"] = 1.0
            decision["outcome"] = {"politics": deepcopy(self._state["politics"]), "rule": node["rule"]}
        decision.update(resolved=True, choice=option_id, resolved_day=self._state["day"])
        self._dispatch("decision", decision["title"], f"Resolved: {option['label']}; actual cost {encoded(option['costs'])}.")
        return "Decision resolved and outcomes recorded. Clock remains paused until resumed."

    def _clock(self, payload):
        mode = payload["mode"]
        if mode == "pause":
            self._state["paused"] = True
        elif mode == "speed":
            if "speed" not in payload:
                raise GameError("speed_required", "Choose speed 1, 5, or 20.")
            self._state["speed"] = payload["speed"]
        elif mode == "resume":
            if self._unresolved():
                raise GameError("decision_pending", "Resolve consequential decisions before resuming.")
            if self._lease_remaining <= 0 or time.monotonic() >= self._lease_deadline:
                raise GameError("lease_required", "Send a session heartbeat before resuming live time.")
            self._state["paused"] = False
        elif mode in ("next_event", "until_project"):
            if self._unresolved():
                raise GameError("decision_pending", "Resolve the pending decision before advancing.")
            self._state["paused"] = True
            self._run_mandates()
            if mode == "next_event":
                event = self._next_event()
                if event is None:
                    raise GameError("no_event", "There is no scheduled event to advance to.")
                self._advance(event)
            else:
                if "node_id" not in payload:
                    raise GameError("node_required", "Choose the project to advance toward.")
                self._node(payload["node_id"])
                # Dependencies may be commissioned by a mandate at each event.
                while not self._unresolved():
                    project = self._project_for(payload["node_id"])
                    if project and project["status"] in ("completed", "awaiting_decision"):
                        break
                    event = self._next_event()
                    if event is None:
                        if project is None:
                            raise GameError("project_not_scheduled", "Target cannot be reached by current orders. Start it or authorize its prerequisites.")
                        break
                    self._advance(event)
        return f"Clock order applied: {mode}."

    def _next_event(self):
        times = [p["finish_day"] for p in self._state["projects"] if p["status"] == "underway"]
        times += [f["route"]["arrival_day"] for f in self._state["fleets"] if f["route"]]
        times += [s["arrival_day"] for s in self._state["shipments"] if s["status"] == "underway"]
        for holder in self._cargo_holders():
            times.extend(lot["expires_day"] for lot in holder["cargo_lots"] if lot["quantity"] > 0)
        return min(times) if times else None

    def _advance(self, target):
        if self._unresolved():
            self._state["paused"] = True
            return
        while self._state["day"] < target:
            event = self._next_event()
            day = min(target, event) if event is not None else target
            self._state["day"] = day
            self._state["year"] = 210 + math.floor(day / 365)
            for fleet in self._state["fleets"]:
                fleet["position"] = self._fleet_position(fleet)
                if fleet["route"] and fleet["route"]["arrival_day"] <= day:
                    self._arrive(fleet)
            for shipment in self._state["shipments"]:
                if shipment["status"] == "underway" and shipment["arrival_day"] <= day:
                    destination = self._get("ports", shipment["to_port"])
                    for lot in shipment["cargo_lots"]:
                        self._add_lot(destination, lot["kind"], lot["quantity"], lot["expires_day"])
                    shipment["cargo_lots"] = []
                    shipment["cargo"] = {}
                    shipment["status"] = "completed"
                    self._dispatch("shipment", "Overland cargo arrived", f"Cargo arrived at {destination['name']}; no fleet crossed Egypt.")
            self._expire_cargo()
            for project in self._state["projects"]:
                if project["status"] == "underway" and project["finish_day"] <= day:
                    self._complete(project)
            if self._unresolved():
                self._state["paused"] = True
                return
            self._run_mandates()

    def _sea_path(self, start, destination, factor):
        queue = [(0.0, start, [])]
        best = {}
        while queue:
            days, current, path = heapq.heappop(queue)
            if current in best:
                continue
            best[current] = days
            if current == destination:
                return path
            for link in self._state["links"]:
                if link["mode"] != "sea" or current not in (link["from"], link["to"]):
                    continue
                forward = current == link["from"]
                other = link["to"] if forward else link["from"]
                if other in best:
                    continue
                leg = {"from": current, "to": other, "days": link["days"] * factor,
                       "coordinates": deepcopy(link["coordinates"] if forward else list(reversed(link["coordinates"]))),
                       "link_id": link["id"], "edge_start": 0.0 if forward else 1.0,
                       "edge_end": 1.0 if forward else 0.0}
                heapq.heappush(queue, (days + leg["days"], other, path + [leg]))
        raise GameError("no_sea_route", "No connected sea route. Egyptian land transfers move cargo, not fleets.")

    def _fleet_position(self, fleet):
        route = fleet["route"]
        if not route:
            return list(fleet["position"])
        day = self._state["day"]
        for leg in route["legs"]:
            if day <= leg["arrival_day"]:
                duration = leg["arrival_day"] - leg["start_day"]
                return interpolate(leg["coordinates"], (day - leg["start_day"]) / duration if duration else 1)
        return list(route["coordinates"][-1])

    def _route(self, fleet, destination):
        self._get("ports", destination)
        factor = 0.7 if fleet["kind"] == "advanced" else 1.0
        day = self._state["day"]
        if fleet["route"]:
            current = next((leg for leg in fleet["route"]["legs"] if leg["arrival_day"] > day), fleet["route"]["legs"][-1])
            duration = current["arrival_day"] - current["start_day"]
            elapsed = min(1.0, max(0.0, (day - current["start_day"]) / duration)) if duration else 1.0
            fraction = current["edge_start"] + elapsed * (current["edge_end"] - current["edge_start"])
            edge = self._get("links", current["link_id"])
            candidates = []
            # Retain the canonical edge and fractional location across repeated reversals.
            for endpoint, endpoint_fraction, points, cost in (
                (edge["to"], 1.0, remaining_polyline(edge["coordinates"], fraction), edge["days"] * factor * (1 - fraction)),
                (edge["from"], 0.0, remaining_polyline(list(reversed(edge["coordinates"])), 1 - fraction), edge["days"] * factor * fraction),
            ):
                try:
                    tail = self._sea_path(endpoint, destination, factor)
                except GameError:
                    continue
                prefix = [{"from": edge["from"] if endpoint == edge["to"] else edge["to"],
                           "to": endpoint, "days": cost, "coordinates": points, "link_id": edge["id"],
                           "edge_start": fraction, "edge_end": endpoint_fraction}]
                candidates.append((cost + sum(leg["days"] for leg in tail), prefix + tail))
            if not candidates:
                raise GameError("no_sea_route", "No connected sea route from the current sea leg.")
            legs = min(candidates, key=lambda item: item[0])[1]
        else:
            if fleet["port_id"] == destination:
                raise GameError("already_there", "Fleet is already at that port.")
            legs = self._sea_path(fleet["port_id"], destination, factor)
        arrival = day
        coordinates = []
        for leg in legs:
            leg["start_day"] = arrival
            arrival += leg["days"]
            leg["arrival_day"] = arrival
            coordinates.extend(leg["coordinates"] if not coordinates else leg["coordinates"][1:])
        return {"destination": destination, "coordinates": coordinates, "start_day": day,
                "arrival_day": arrival, "legs": legs, "previous_arrival_day": fleet["route"]["arrival_day"] if fleet["route"] else None,
                "cause": "Rerouted from interpolated position via the shortest remaining sea-link path" if fleet["route"] else "Connected sea links; advanced sailing factor 0.7" if factor < 1 else "Connected sea links at Roman sailing speed"}

    def _route_message(self, route):
        old = route["previous_arrival_day"]
        change = f" Previous ETA day {old:.2f}; changed by {route['arrival_day'] - old:+.2f} days." if old is not None else ""
        return f"Arrival day {route['arrival_day']:.2f}. {route['cause']}.{change}"

    def _move(self, identifier, destination):
        fleet = self._get("fleets", identifier)
        route = self._route(fleet, destination)
        fleet["position"] = self._fleet_position(fleet)
        fleet["port_id"] = None
        fleet["route"] = route
        if route["arrival_day"] <= self._state["day"]:
            self._arrive(fleet)
        message = self._route_message(route)
        self._dispatch("movement", f"{fleet['name']} → {self._get('ports', destination)['name']}", message)
        return message

    def _arrive(self, fleet):
        destination = self._get("ports", fleet["route"]["destination"])
        fleet["position"] = list(destination["position"])
        fleet["port_id"] = destination["id"]
        fleet["route"] = None
        self._dispatch("arrival", f"{fleet['name']} arrived", destination["name"])
        if destination["id"] == "panyu" and fleet.get("expedition") == "outbound":
            identifier = f"citrus-{fleet['id']}-{len(self._state['decisions']) + 1}"
            self._state["decisions"].append({"id": identifier, "title": "Negotiate for sweet citrus",
                "description": "The variety is an explicit historical assumption. Purchase fruit and watered plants, or decline. Fresh fruit will spoil on a long return; living plants may survive.",
                "project_id": None, "fleet_id": fleet["id"], "kind": "citrus", "resolved": False,
                "options": [{"id": "trade", "label": "Trade for fruit and plants", "costs": {"treasury": 100}},
                            {"id": "decline", "label": "Decline acquisition", "costs": {}}]})
            fleet.pop("expedition", None)
            self._state["paused"] = True
        if destination["id"] == "berenike" and fleet.get("expedition") == "return":
            fleet.pop("expedition", None)
            self._dispatch("logistics", "Egyptian transfer required", "Unload cargo at Berenike; order a land shipment to Alexandria; use a separate Mediterranean fleet for Rome.")

    def _cargo_holders(self):
        return [*self._state["ports"], *self._state["fleets"], *self._state["shipments"]]

    def _cargo_inventory(self, holder):
        return holder["inventory"] if "inventory" in holder else holder["cargo"]

    def _add_lot(self, holder, kind, quantity, expires_day):
        if not quantity:
            return
        holder["cargo_lots"].append({"kind": kind, "quantity": quantity, "expires_day": expires_day})
        inventory = self._cargo_inventory(holder)
        inventory[kind] = inventory.get(kind, 0) + quantity

    def _take_cargo(self, source, destination, cargo):
        quantities = {kind: amount for kind, amount in cargo.items() if amount}
        if not quantities:
            raise GameError("empty_cargo", "Choose a positive cargo quantity.")
        inventory = self._cargo_inventory(source)
        for kind, amount in quantities.items():
            if inventory.get(kind, 0) < amount:
                raise GameError("insufficient_cargo", f"Source does not have {amount} {kind}.")
        if "ships" in destination:
            capacity = destination["ships"] * (60 if destination["kind"] == "advanced" else 25)
            if sum(destination["cargo"].values()) + sum(quantities.values()) > capacity:
                raise GameError("cargo_capacity", f"Fleet capacity is {capacity} cargo units.")
        for kind, amount in quantities.items():
            remaining = amount
            for lot in sorted(source["cargo_lots"], key=lambda lot: lot["expires_day"]):
                if lot["kind"] != kind or not lot["quantity"]:
                    continue
                quantity = min(remaining, lot["quantity"])
                self._add_lot(destination, kind, quantity, lot["expires_day"])
                lot["quantity"] -= quantity
                remaining -= quantity
                if not remaining:
                    break
            inventory[kind] -= amount
        source["cargo_lots"] = [lot for lot in source["cargo_lots"] if lot["quantity"]]

    def _cargo(self, payload):
        fleet = self._get("fleets", payload["fleet_id"])
        if not fleet["port_id"] or fleet["route"]:
            raise GameError("fleet_not_docked", "Cargo transfer requires a docked fleet.")
        port = self._get("ports", fleet["port_id"])
        source, destination = (port, fleet) if payload["mode"] == "load" else (fleet, port)
        self._take_cargo(source, destination, payload["cargo"])
        self._dispatch("cargo", f"Cargo {payload['mode']}", f"{fleet['name']} at {port['name']}: {encoded(payload['cargo'])}. Original expiry dates preserved.")
        if payload["mode"] == "unload" and port["id"] == "rome" and payload["cargo"].get("plants", 0):
            if "citrus_acclimatization" not in self._state["capabilities"]:
                self._state["capabilities"].append("citrus_acclimatization")
                self._state["tutorial"] = "completed" if self._state["tutorial"] != "skipped" else "skipped"
                self._dispatch("cultivation", "Living citrus reaches Rome", "Plants arrived alive. Commission the supported cultivation primitive to establish a garden and produce fresh fruit. Your Majesty, what shall we do for Rome?")
        return "Cargo transferred without resetting spoilage or survival deadlines."

    def _transfer(self, payload):
        source = self._get("ports", payload["from_port"])
        destination = self._get("ports", payload["to_port"])
        link = next((link for link in self._state["links"] if link["mode"] == "land" and
                     {link["from"], link["to"]} == {source["id"], destination["id"]}), None)
        if not link:
            raise GameError("no_land_route", "No supported overland cargo connection between those ports.")
        quantity = sum(payload["cargo"].values())
        if quantity > 40:
            raise GameError("shipment_capacity", "A caravan carries at most 40 cargo units.")
        self._spend({"treasury": 20, "food": 10})
        shipment = {"id": f"shipment-{len(self._state['shipments']) + 1}", "from_port": source["id"],
                    "to_port": destination["id"], "start_day": self._state["day"],
                    "arrival_day": self._state["day"] + link["days"], "status": "underway",
                    "cargo": {}, "cargo_lots": [], "coordinates": deepcopy(link["coordinates"] if link["from"] == source["id"] else list(reversed(link["coordinates"])))}
        self._take_cargo(source, shipment, payload["cargo"])
        self._state["shipments"].append(shipment)
        self._dispatch("shipment", "Overland transfer commissioned", f"{source['name']} to {destination['name']}, arrival day {shipment['arrival_day']}; 20 treasury and 10 food committed.")
        return "Caravan scheduled. Fleets remain in their respective seas."

    def _expire_cargo(self):
        for holder in self._cargo_holders():
            inventory = self._cargo_inventory(holder)
            for lot in holder["cargo_lots"]:
                if lot["quantity"] and lot["expires_day"] <= self._state["day"]:
                    inventory[lot["kind"]] -= lot["quantity"]
                    self._dispatch("spoilage", f"{lot['kind'].title()} lost", f"{lot['quantity']} units at {holder.get('name', holder['id'])} reached their saved survival deadline.")
                    lot["quantity"] = 0
            holder["cargo_lots"] = [lot for lot in holder["cargo_lots"] if lot["quantity"]]
