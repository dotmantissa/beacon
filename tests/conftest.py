"""
Shared test infrastructure for Beacon contract tests.

Tests run against the GenLayer Studio network (https://studio.genlayer.com/api)
by default. All tests are automatically skipped when the endpoint is not reachable.

Run:
  pytest tests/ -v

Override endpoint:
  pytest tests/ -v --rpc-url=http://127.0.0.1:4000/api
"""
from __future__ import annotations

import base64
import json
import urllib.error
import urllib.request
from pathlib import Path

import pytest

STUDIONET_URL = "https://studio.genlayer.com/api"
CONTRACTS_DIR = Path(__file__).resolve().parent.parent / "contracts"


def _endpoint_available(url: str) -> bool:
    try:
        import urllib.error
        req = urllib.request.Request(
            url,
            data=b'{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}',
            headers={
                "Content-Type": "application/json",
                "User-Agent": "beacon-tests/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8):
            return True
    except urllib.error.HTTPError:
        return True  # server responded — it's up
    except Exception:
        return False


NETWORK_UP = _endpoint_available(STUDIONET_URL)
skip_no_network = pytest.mark.skipif(
    not NETWORK_UP,
    reason="GenLayer Studio network not reachable",
)

try:
    from gltest import get_contract_factory, create_account  # type: ignore[attr-defined]
    _GLTEST_OK = True
except ImportError:
    _GLTEST_OK = False


# ------------------------------------------------------------------
# Sample incidents
# ------------------------------------------------------------------

THEFT_INCIDENT = {
    "incident_type": "theft",
    "description": (
        "A person was seen breaking the window of a parked vehicle on Station Road "
        "and removing items from inside. The car was a dark blue saloon. "
        "The suspect fled on foot heading north."
    ),
    "location_lat": "51.5074",
    "location_lng": "-0.1278",
    "location_label": "Station Road, near the junction with Park Lane",
    "neighbourhood_id": "test-neighbourhood",
    "evidence_urls": "[]",
    "severity": "high",
}

DAMAGE_INCIDENT = {
    "incident_type": "criminal_damage",
    "description": (
        "Graffiti has appeared overnight on the wall of the community centre on "
        "High Street. Large lettering in red and black spray paint. "
        "Broken glass also visible at the entrance."
    ),
    "location_lat": "51.5080",
    "location_lng": "-0.1300",
    "location_label": "High Street Community Centre",
    "neighbourhood_id": "test-neighbourhood",
    "evidence_urls": "[]",
    "severity": "medium",
}

SHORT_INCIDENT = {
    "incident_type": "other",
    "description": "Something happened here.",
    "location_lat": "0",
    "location_lng": "0",
    "location_label": "Unknown",
    "neighbourhood_id": "test-neighbourhood",
    "evidence_urls": "[]",
    "severity": "low",
}


def _submit_args(d: dict) -> list:
    return [
        d["incident_type"],
        d["description"],
        d["location_lat"],
        d["location_lng"],
        d["location_label"],
        d["neighbourhood_id"],
        d["evidence_urls"],
        d["severity"],
    ]


def _extract_write_return_value(tx: dict) -> str:
    """
    Pull the contract's actual `return` string out of a GenLayerTransaction
    receipt. gltest's write methods return the full chain receipt, not the
    contract's return value — the real payload lives at
    consensus_data.leader_receipt[0].result, and (since our contract methods
    return `json.dumps(...)`) it is JSON-encoded once more on top of that.
    """
    try:
        result = tx["consensus_data"]["leader_receipt"][0]["result"]
    except (KeyError, IndexError, TypeError):
        return ""

    try:
        if isinstance(result, dict):
            payload = result.get("payload")
            if isinstance(payload, dict):
                return json.loads(payload["readable"])
            if isinstance(payload, str):
                return json.loads(payload)
        elif isinstance(result, str):
            raw = bytearray(base64.b64decode(result + "=="))
            if raw and raw[0] == 0:  # 0 == "return"
                from genlayer_py.abi.calldata import decode, to_str

                decoded = decode(bytes(raw[1:]))
                return json.loads(to_str(decoded))
    except Exception:
        return ""
    return ""


def _parse(result: str | dict) -> dict:
    """
    Parse a contract call's result, whether it came from a read method
    (returns the value directly) or a write method (returns a
    GenLayerTransaction receipt that wraps the value).
    """
    if isinstance(result, dict):
        if "consensus_data" in result:
            return _parse(_extract_write_return_value(result))
        return result
    if isinstance(result, str) and result:
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            return {}
    return {}


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------

@pytest.fixture(scope="session")
def account():
    if not NETWORK_UP:
        pytest.skip("Network not reachable")
    if not _GLTEST_OK:
        pytest.skip("gltest not installed")
    return create_account()


@pytest.fixture(scope="session")
def account2():
    if not NETWORK_UP:
        pytest.skip("Network not reachable")
    if not _GLTEST_OK:
        pytest.skip("gltest not installed")
    return create_account()


@pytest.fixture(scope="session")
def beacon_factory():
    if not NETWORK_UP:
        pytest.skip("Network not reachable")
    if not _GLTEST_OK:
        pytest.skip("gltest not installed")
    return get_contract_factory("BeaconIncident")


@pytest.fixture(scope="session")
def contract(beacon_factory, account):
    """Single contract deployment shared across all tests in the session.
    Each test creates its own incident(s) within this contract so state
    does not bleed between tests."""
    return beacon_factory.deploy(account=account)
