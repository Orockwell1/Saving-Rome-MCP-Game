"""Strict, data-only public command and generated development definitions."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr, field_validator

Identifier = Annotated[StrictStr, Field(min_length=1, max_length=96, pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_.-]*$")]
Text = Annotated[StrictStr, Field(min_length=1, max_length=2000)]


class Definition(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Icon(Definition):
    base: Identifier
    badge: Identifier | None = None
    variant: Literal["navy", "burgundy", "olive"] = "navy"
    seed: Annotated[StrictInt, Field(ge=0, le=2147483647)] = 0


class Provenance(Definition):
    author: Text
    version: Text


class NodeProposal(Definition):
    id: Identifier
    title: Text
    description: Text
    rule: Identifier
    location_id: Identifier
    prerequisites: Annotated[list[Identifier], Field(max_length=500)]
    icon: Icon
    scope: Text
    people: Annotated[list[Text], Field(max_length=30)]


class TreeProposal(Definition):
    @field_validator("version", mode="before")
    @classmethod
    def strict_version(cls, value):
        if type(value) is not int:
            raise ValueError("Version must be the integer 1")
        return value

    id: Identifier
    title: Text
    ambition: Text
    version: Literal[1]
    provenance: Provenance
    nodes: Annotated[list[NodeProposal], Field(min_length=1, max_length=500)]


class Command(Definition):
    command_id: Identifier
    expected_revision: Annotated[StrictInt, Field(ge=0)]
    action: Identifier
    payload: dict


class TreeId(Definition):
    tree_id: Identifier


class ProposalPayload(Definition):
    proposal: TreeProposal


class NodeId(Definition):
    node_id: Identifier


class Move(Definition):
    fleet_id: Identifier
    destination: Identifier


class Clock(Definition):
    mode: Literal["pause", "resume", "speed", "next_event", "until_project"]
    speed: Literal[1, 5, 20] | None = None
    node_id: Identifier | None = None

    @field_validator("speed", mode="before")
    @classmethod
    def strict_speed(cls, value):
        if value is not None and type(value) is not int:
            raise ValueError("Speed must be an integer")
        return value


class DecisionChoice(Definition):
    decision_id: Identifier
    option_id: Identifier


class Mandate(Definition):
    id: Identifier
    title: Text
    tree_id: Identifier
    budget: Annotated[float, Field(ge=0, le=1000000, allow_inf_nan=False)]
    enabled: bool


class Tutorial(Definition):
    mode: Literal["start", "skip"]


class Selection(Definition):
    kind: Literal["fleet", "port", "territory", "node"]
    id: Identifier


class Expedition(Definition):
    mode: Literal["outbound", "return"]
    fleet_id: Identifier


class Cargo(Definition):
    fruit: Annotated[StrictInt, Field(ge=0, le=1000)] = 0
    plants: Annotated[StrictInt, Field(ge=0, le=1000)] = 0


class CargoOrder(Definition):
    fleet_id: Identifier
    mode: Literal["load", "unload"]
    cargo: Cargo


class Transfer(Definition):
    from_port: Identifier
    to_port: Identifier
    cargo: Cargo


class Empty(Definition):
    pass


PAYLOADS = {
    "propose_tree": ProposalPayload, "accept_tree": TreeId, "start_project": NodeId,
    "move": Move, "clock": Clock, "resolve_decision": DecisionChoice,
    "set_mandate": Mandate, "tutorial": Tutorial, "select": Selection,
    "heartbeat": Empty, "expedition": Expedition, "cargo": CargoOrder,
    "transfer_cargo": Transfer,
}
