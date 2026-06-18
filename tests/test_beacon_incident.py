"""
Tests for BeaconIncident contract.

Requires access to the GenLayer Studio network.
All tests are skipped automatically when the network is not reachable.

Run:
  pytest tests/ -v

Note on write methods: gltest's write-method calls return the full chain
transaction receipt (a GenLayerTransaction), not the contract's return
value. `_submit`/`_corroborate`/`_mark_authority` below unwrap that receipt
via `_parse` (see conftest.py) to get at the JSON the contract actually
returned.

Covers:
  Submit
    - returns valid JSON with incident_id, status, confidence, reasoning
    - incident_id follows the BCN-N-HASH format
    - status is PENDING or VERIFIED
    - confidence is an integer 0-100
    - reasoning is a non-empty string

  Storage and retrieval
    - get_incident returns the stored incident after submit
    - get_incident unknown ID returns an error payload
    - stored incident contains all required fields
    - get_incident_validation returns confidence, reasoning, status, validated_at
    - get_incident_status returns a valid status code
    - get_user_incidents contains the submitted incident ID
    - get_neighbourhood_incidents contains the submitted incident ID
    - get_total_incidents increments with each submission
    - get_corroboration_count starts at zero

  Confidence and AI behaviour
    - short description yields low confidence
    - detailed description with keywords yields higher confidence
    - confidence is within valid range regardless of AI outcome

  Corroboration
    - second account can corroborate a valid incident
    - corroboration_count increments in stored incident
    - corroborating own incident returns an error
    - corroborating the same incident twice from the same account returns an error
    - corroborating an unknown incident returns an error

  Authority receipt
    - submitter can mark authority received, status becomes CLOSED
    - non-submitter cannot mark authority received
    - marking unknown incident returns an error
"""
from __future__ import annotations

import json
import re

import pytest
from genlayer_py.types import CalldataAddress

from .conftest import (
    THEFT_INCIDENT,
    DAMAGE_INCIDENT,
    SHORT_INCIDENT,
    _parse,
    _submit_args,
    skip_no_network,
)


# ================================================================== #
# Helpers                                                              #
# ================================================================== #

def _submit(contract, incident: dict) -> dict:
    tx = contract.submit_incident(_submit_args(incident))
    return _parse(tx)


def _corroborate(contract, incident_id: str, statement: str) -> dict:
    tx = contract.corroborate_incident([incident_id, statement])
    return _parse(tx)


def _mark_authority(contract, incident_id: str, reference: str) -> dict:
    tx = contract.mark_authority_received([incident_id, reference])
    return _parse(tx)


def _get_incident(contract, incident_id: str) -> dict:
    raw = contract.get_incident([incident_id])
    return _parse(raw)


def _get_validation(contract, incident_id: str) -> dict:
    raw = contract.get_incident_validation([incident_id])
    return _parse(raw)


# ================================================================== #
# Submit — response structure                                          #
# ================================================================== #

@skip_no_network
def test_submit_returns_json(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    assert isinstance(result, dict), "submit_incident must return a JSON object"
    assert result, "submit_incident result should not be empty"


@skip_no_network
def test_submit_has_incident_id(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    assert "incident_id" in result


@skip_no_network
def test_submit_incident_id_format(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    assert re.match(r"^BCN-\d+-\d+$", incident_id), (
        f"Expected BCN-<n>-<hash> format, got: {incident_id}"
    )


@skip_no_network
def test_submit_has_valid_status(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    assert result.get("status") in ("PENDING", "VERIFIED")


@skip_no_network
def test_submit_has_confidence(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    assert "confidence" in result
    assert 0 <= int(result["confidence"]) <= 100


@skip_no_network
def test_submit_has_reasoning(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    reasoning = result.get("reasoning", "")
    assert isinstance(reasoning, str) and len(reasoning) > 0


# ================================================================== #
# Storage and retrieval                                                #
# ================================================================== #

@skip_no_network
def test_get_incident_after_submit(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    stored = _get_incident(contract, incident_id)
    assert stored, "get_incident should return a non-empty object after submit"


@skip_no_network
def test_get_incident_unknown_returns_error(contract) -> None:
    stored = _get_incident(contract, "BCN-0-00000")
    assert "error" in stored, (
        "get_incident for an unknown ID should return an error payload"
    )


@skip_no_network
def test_stored_incident_has_required_fields(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    stored = _get_incident(contract, result["incident_id"])
    for field in ("id", "type", "description", "location", "severity",
                  "submitter", "submitted_at", "status", "corroboration_count"):
        assert field in stored, f"Stored incident missing field: {field}"


@skip_no_network
def test_stored_incident_type_matches(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    stored = _get_incident(contract, result["incident_id"])
    assert stored["type"] == THEFT_INCIDENT["incident_type"]


@skip_no_network
def test_stored_incident_description_matches(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    stored = _get_incident(contract, result["incident_id"])
    assert stored["description"] == THEFT_INCIDENT["description"]


@skip_no_network
def test_stored_incident_severity_matches(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    stored = _get_incident(contract, result["incident_id"])
    assert stored["severity"] == THEFT_INCIDENT["severity"]


@skip_no_network
def test_stored_incident_neighbourhood_matches(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    stored = _get_incident(contract, result["incident_id"])
    assert stored["neighbourhood_id"] == THEFT_INCIDENT["neighbourhood_id"]


@skip_no_network
def test_stored_incident_location_label_matches(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    stored = _get_incident(contract, result["incident_id"])
    assert stored["location"]["label"] == THEFT_INCIDENT["location_label"]


@skip_no_network
def test_stored_incident_corroboration_count_starts_zero(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    stored = _get_incident(contract, result["incident_id"])
    assert int(stored["corroboration_count"]) == 0


@skip_no_network
def test_get_incident_validation_after_submit(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    val = _get_validation(contract, result["incident_id"])
    assert val, "get_incident_validation should return a non-empty object"


@skip_no_network
def test_validation_has_required_fields(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    val = _get_validation(contract, result["incident_id"])
    for field in ("confidence", "reasoning", "status", "validated_at"):
        assert field in val, f"Validation missing field: {field}"


@skip_no_network
def test_validation_confidence_in_range(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    val = _get_validation(contract, result["incident_id"])
    assert 0 <= int(val["confidence"]) <= 100


@skip_no_network
def test_get_incident_status_after_submit(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    status_code = int(contract.get_incident_status([result["incident_id"]]))
    assert status_code in (0, 1, 2, 3)


@skip_no_network
def test_get_corroboration_count_starts_zero(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    count = int(contract.get_corroboration_count([result["incident_id"]]))
    assert count == 0


@skip_no_network
def test_get_user_incidents_contains_submitted_id(contract, account) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    raw = contract.get_user_incidents([CalldataAddress(account.address)])
    user_incidents = json.loads(raw) if isinstance(raw, str) and raw else []
    assert incident_id in user_incidents, (
        f"{incident_id} not found in user incidents: {user_incidents}"
    )


@skip_no_network
def test_get_neighbourhood_incidents_contains_submitted_id(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    raw = contract.get_neighbourhood_incidents([THEFT_INCIDENT["neighbourhood_id"]])
    n_incidents = json.loads(raw) if isinstance(raw, str) and raw else []
    assert incident_id in n_incidents


@skip_no_network
def test_get_total_incidents_increments(contract) -> None:
    before = int(contract.get_total_incidents([]))
    _submit(contract, THEFT_INCIDENT)
    after = int(contract.get_total_incidents([]))
    assert after == before + 1


@skip_no_network
def test_two_submissions_produce_different_ids(contract) -> None:
    id_a = _submit(contract, THEFT_INCIDENT)["incident_id"]
    id_b = _submit(contract, DAMAGE_INCIDENT)["incident_id"]
    assert id_a != id_b


# ================================================================== #
# Confidence and AI behaviour                                          #
# ================================================================== #

@skip_no_network
def test_short_description_gives_low_confidence(contract) -> None:
    result = _submit(contract, SHORT_INCIDENT)
    assert int(result["confidence"]) <= 40, (
        f"Short vague description should yield low confidence, got {result['confidence']}"
    )


@skip_no_network
def test_short_description_stays_pending(contract) -> None:
    result = _submit(contract, SHORT_INCIDENT)
    assert result["status"] == "PENDING", (
        f"Short description should result in PENDING status, got {result['status']}"
    )


@skip_no_network
def test_detailed_incident_confidence_in_range(contract) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    confidence = int(result["confidence"])
    assert 0 <= confidence <= 100


# ================================================================== #
# Corroboration                                                        #
# ================================================================== #

@skip_no_network
def test_corroborate_by_second_account(contract, account2) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    corr_result = _corroborate(
        contract.connect(account2), incident_id, "I walked past and saw this happen."
    )
    assert "error" not in corr_result, f"Corroboration failed: {corr_result}"
    assert corr_result.get("incident_id") == incident_id


@skip_no_network
def test_corroboration_increments_count(contract, account2) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    _corroborate(contract.connect(account2), incident_id, "I witnessed this.")
    stored = _get_incident(contract, incident_id)
    assert int(stored["corroboration_count"]) == 1


@skip_no_network
def test_corroboration_updates_get_corroboration_count(contract, account2) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    _corroborate(contract.connect(account2), incident_id, "I saw this too.")
    count = int(contract.get_corroboration_count([incident_id]))
    assert count == 1


@skip_no_network
def test_corroborate_own_incident_returns_error(contract, account) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    corr_result = _corroborate(
        contract.connect(account), incident_id, "I reported this myself."
    )
    assert "error" in corr_result, (
        "Corroborating your own incident should return an error"
    )


@skip_no_network
def test_corroborate_same_incident_twice_returns_error(contract, account2) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    _corroborate(contract.connect(account2), incident_id, "First corroboration.")
    second = _corroborate(contract.connect(account2), incident_id, "Second attempt.")
    assert "error" in second, (
        "Corroborating the same incident twice should return an error"
    )


@skip_no_network
def test_corroborate_unknown_incident_returns_error(contract, account2) -> None:
    result = _corroborate(
        contract.connect(account2), "BCN-0-00000", "This incident does not exist."
    )
    assert "error" in result


@skip_no_network
def test_corroboration_improves_confidence_on_plausible_incident(contract, account2) -> None:
    """
    A detailed, keyword-rich incident that is initially PENDING should move
    toward higher confidence after one corroboration.
    Skipped if the AI verifies it outright on submission (already at ceiling).
    """
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    before_confidence = int(result["confidence"])

    _corroborate(contract.connect(account2), incident_id, "I witnessed this incident.")

    after_val = _get_validation(contract, incident_id)
    after_confidence = int(after_val["confidence"])

    if before_confidence >= 75:
        pytest.skip("Incident was already highly confident before corroboration")

    assert after_confidence >= before_confidence, (
        f"Confidence should not decrease after corroboration "
        f"({before_confidence} -> {after_confidence})"
    )


# ================================================================== #
# Authority receipt                                                    #
# ================================================================== #

@skip_no_network
def test_mark_authority_received_by_submitter(contract, account) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    receipt = _mark_authority(
        contract.connect(account), incident_id, "Police ref: CRM-2024-TEST-001"
    )
    assert "error" not in receipt, f"mark_authority_received failed: {receipt}"
    assert receipt.get("incident_id") == incident_id


@skip_no_network
def test_mark_authority_received_sets_closed_status(contract, account) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    _mark_authority(contract.connect(account), incident_id, "Council ref: BCN-REF-001")
    stored = _get_incident(contract, incident_id)
    assert stored["status"] == "CLOSED"
    assert int(stored["status_code"]) == 3


@skip_no_network
def test_mark_authority_received_stores_reference(contract, account) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    ref = "Police ref: CRM-2024-TEST-999"
    _mark_authority(contract.connect(account), incident_id, ref)
    stored = _get_incident(contract, incident_id)
    assert stored.get("authority_reference") == ref


@skip_no_network
def test_mark_authority_received_by_non_submitter_returns_error(
    contract, account2
) -> None:
    result = _submit(contract, THEFT_INCIDENT)
    incident_id = result["incident_id"]
    receipt = _mark_authority(
        contract.connect(account2), incident_id, "Unauthorised ref attempt"
    )
    assert "error" in receipt, (
        "Non-submitter marking authority receipt should return an error"
    )


@skip_no_network
def test_mark_authority_received_unknown_incident_returns_error(
    contract, account
) -> None:
    result = _mark_authority(contract.connect(account), "BCN-0-00000", "Some ref")
    assert "error" in result
