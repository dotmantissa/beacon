import hashlib
import json

CONTRACT = "contracts/beacon_incident.py"
EVIDENCE_URL = "https://res.cloudinary.com/beacon/image/upload/test.png"
AUTHORITY_URL = "https://news.met.police.uk/incidents/test-incident"
PNG_BYTES = b"\x89PNG\r\n\x1a\nbeacon-incident-evidence"


def _incident(evidence_refs=None):
    return [
        "theft",
        (
            "A blue car had its passenger window broken outside Station Road. "
            "A person removed a black backpack and left on foot."
        ),
        "51.5074",
        "-0.1278",
        "Station Road",
        "test-neighbourhood",
        json.dumps(evidence_refs or []),
        "high",
    ]


def _assessment(**overrides):
    result = {
        "status": "VERIFIED",
        "confidence": 91,
        "reasoning": "The committed image and official record describe the same event.",
        "evidence_assessment": "The image shows the reported vehicle damage.",
        "evidence_supports_incident": True,
        "public_records_support_incident": True,
    }
    result.update(overrides)
    return json.dumps(result)


def _mock_public_records(direct_vm):
    direct_vm.mock_web(
        r".*data\.police\.uk/api/crimes-street-dates.*",
        {
            "status": 200,
            "body": json.dumps([{"date": "2026-08"}]),
        },
    )
    direct_vm.mock_web(
        r".*data\.police\.uk/api/crimes-street/all-crime.*",
        {
            "status": 200,
            "body": json.dumps(
                [
                    {
                        "persistent_id": "official-record-1",
                        "category": "vehicle-crime",
                        "month": "2026-08",
                        "location": {
                            "latitude": "51.5074",
                            "longitude": "-0.1278",
                            "street": {"name": "On or near Station Road"},
                        },
                        "outcome_status": {
                            "category": "Under investigation",
                        },
                    }
                ]
            ),
        },
    )


def _mock_evidence(direct_vm, body=PNG_BYTES):
    direct_vm.mock_web(
        r".*res\.cloudinary\.com/beacon/image/upload/test\.png.*",
        {
            "method": "GET",
            "response": {
                "status": 200,
                "headers": {"content-type": b"image/png"},
                "body": body,
            },
        },
    )


def _mock_incident_assessment(direct_vm, response=None):
    direct_vm.mock_llm(
        r"(?s).*independent incident-evidence validator.*",
        response or _assessment(),
    )


def _deploy(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    direct_vm.warp("2026-08-19T12:00:00Z")
    return direct_deploy(CONTRACT)


def _submit(contract, evidence_refs=None):
    return json.loads(contract.submit_incident(*_incident(evidence_refs)))


def test_description_heuristics_cannot_verify(
    direct_vm, direct_deploy, direct_alice
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(direct_vm)

    result = _submit(contract)

    assert result["status"] == "PENDING"
    assert result["confidence"] <= 49
    assert contract.get_incident_status(result["incident_id"]) == 0


def test_matching_committed_evidence_and_public_record_can_verify(
    direct_vm, direct_deploy, direct_alice
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    evidence_hash = hashlib.sha256(PNG_BYTES).hexdigest()
    refs = [{"url": EVIDENCE_URL, "sha256": evidence_hash}]
    _mock_evidence(direct_vm)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(direct_vm)

    result = _submit(contract, refs)
    stored = json.loads(contract.get_incident(result["incident_id"]))
    validation = json.loads(
        contract.get_incident_validation(result["incident_id"])
    )

    assert result["status"] == "VERIFIED"
    assert result["incident_id"].startswith("BCN-0-")
    assert stored["evidence_hashes"] == [evidence_hash]
    assert validation["evidence_commitments_verified"] is True
    assert validation["evidence_supports_incident"] is True
    assert validation["public_records_support_incident"] is True
    assert contract.get_incident_status(result["incident_id"]) == 1
    assert contract.get_total_incidents() == 1


def test_uncommitted_evidence_is_rejected_without_incrementing_count(
    direct_vm, direct_deploy, direct_alice
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)

    result = _submit(contract, [{"url": EVIDENCE_URL}])

    assert "error" in result
    assert "SHA-256" in result["error"]
    assert contract.get_total_incidents() == 0


def test_hash_mismatch_stays_disputed_after_corroboration(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    submitted_hash = "a" * 64
    refs = [{"url": EVIDENCE_URL, "sha256": submitted_hash}]
    _mock_evidence(direct_vm)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(direct_vm)

    result = _submit(contract, refs)
    assert result["status"] == "DISPUTED"

    direct_vm.sender = direct_bob
    corroboration = json.loads(
        contract.corroborate_incident(
            result["incident_id"],
            "I saw the damaged car at the stated location.",
        )
    )
    stored = json.loads(contract.get_incident(result["incident_id"]))

    assert corroboration["new_status"] == "DISPUTED"
    assert stored["evidence_hashes"] == [submitted_hash]


def test_public_record_availability_alone_cannot_verify(
    direct_vm, direct_deploy, direct_alice
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    evidence_hash = hashlib.sha256(PNG_BYTES).hexdigest()
    refs = [{"url": EVIDENCE_URL, "sha256": evidence_hash}]
    _mock_evidence(direct_vm)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(
        direct_vm,
        _assessment(
            public_records_support_incident=False,
            reasoning="The nearby official record is not the same incident.",
        ),
    )

    result = _submit(contract, refs)

    assert result["status"] == "PENDING"
    assert result["confidence"] <= 49


def test_low_confidence_evidence_assessment_cannot_verify(
    direct_vm, direct_deploy, direct_alice
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    evidence_hash = hashlib.sha256(PNG_BYTES).hexdigest()
    refs = [{"url": EVIDENCE_URL, "sha256": evidence_hash}]
    _mock_evidence(direct_vm)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(direct_vm, _assessment(confidence=69))

    result = _submit(contract, refs)

    assert result["status"] == "PENDING"
    assert result["confidence"] <= 49


def test_corroboration_reassesses_with_authenticated_sources(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    evidence_hash = hashlib.sha256(PNG_BYTES).hexdigest()
    refs = [{"url": EVIDENCE_URL, "sha256": evidence_hash}]
    _mock_evidence(direct_vm)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(
        direct_vm,
        _assessment(
            status="PENDING",
            confidence=42,
            evidence_supports_incident=False,
            public_records_support_incident=False,
        ),
    )

    result = _submit(contract, refs)
    assert result["status"] == "PENDING"

    direct_vm.clear_mocks()
    _mock_evidence(direct_vm)
    _mock_public_records(direct_vm)
    direct_vm.mock_llm(
        r"(?s).*I saw the damaged car at the stated location.*",
        _assessment(),
    )

    direct_vm.sender = direct_bob
    corroboration = json.loads(
        contract.corroborate_incident(
            result["incident_id"],
            "I saw the damaged car at the stated location.",
        )
    )
    stored = json.loads(contract.get_incident(result["incident_id"]))
    validation = json.loads(
        contract.get_incident_validation(result["incident_id"])
    )

    assert corroboration["corroboration_count"] == 1
    assert corroboration["new_status"] == "VERIFIED"
    assert stored["status"] == "VERIFIED"
    assert validation["evidence_commitments_verified"] is True
    assert validation["public_records_support_incident"] is True


def test_validator_rejects_changed_evidence_snapshot(
    direct_vm, direct_deploy, direct_alice
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    evidence_hash = hashlib.sha256(PNG_BYTES).hexdigest()
    refs = [{"url": EVIDENCE_URL, "sha256": evidence_hash}]
    _mock_evidence(direct_vm)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(direct_vm)

    result = _submit(contract, refs)
    assert result["status"] == "VERIFIED"

    direct_vm.clear_mocks()
    _mock_evidence(direct_vm, b"changed evidence bytes")
    _mock_public_records(direct_vm)
    _mock_incident_assessment(direct_vm)

    assert direct_vm.run_validator() is False


def test_plain_text_authority_reference_cannot_close(
    direct_vm, direct_deploy, direct_alice
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(direct_vm)
    result = _submit(contract)

    receipt = json.loads(
        contract.mark_authority_received(
            result["incident_id"],
            "Police ref: CRM-2026-TEST-001",
        )
    )

    assert "error" in receipt
    stored = json.loads(contract.get_incident(result["incident_id"]))
    assert stored["status"] == "PENDING"


def test_authenticated_authority_page_can_close(
    direct_vm, direct_deploy, direct_alice
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(direct_vm)
    result = _submit(contract)
    authority_body = (
        b"Met Police incident CRM-2026-TEST-001: vehicle break-in on "
        b"Station Road received and under investigation."
    )
    direct_vm.mock_web(
        r".*news\.met\.police\.uk/incidents/test-incident.*",
        {
            "status": 200,
            "body": authority_body,
        },
    )
    direct_vm.mock_llm(
        r"(?s).*authenticating a public authority receipt.*",
        json.dumps(
            {
                "confirmed": True,
                "confidence": 94,
                "reasoning": "The police page names the same location and event.",
            }
        ),
    )

    receipt = json.loads(
        contract.mark_authority_received(
            result["incident_id"],
            AUTHORITY_URL,
        )
    )

    assert receipt["status"] == "CLOSED"
    assert receipt["source_sha256"] == hashlib.sha256(authority_body).hexdigest()
    stored = json.loads(contract.get_incident(result["incident_id"]))
    assert stored["status"] == "CLOSED"
    assert contract.get_incident_status(result["incident_id"]) == 3


def test_low_confidence_authority_assessment_cannot_close(
    direct_vm, direct_deploy, direct_alice
):
    contract = _deploy(direct_vm, direct_deploy, direct_alice)
    _mock_public_records(direct_vm)
    _mock_incident_assessment(direct_vm)
    result = _submit(contract)
    authority_body = b"Police incident CRM-2026-TEST-001: Station Road."
    direct_vm.mock_web(
        r".*news\.met\.police\.uk/incidents/test-incident.*",
        {"status": 200, "body": authority_body},
    )
    direct_vm.mock_llm(
        r"(?s).*authenticating a public authority receipt.*",
        json.dumps(
            {
                "confirmed": True,
                "confidence": 69,
                "reasoning": "The source is probably related.",
            }
        ),
    )

    receipt = json.loads(
        contract.mark_authority_received(
            result["incident_id"],
            AUTHORITY_URL,
        )
    )

    assert "error" in receipt
    stored = json.loads(contract.get_incident(result["incident_id"]))
    assert stored["status"] == "PENDING"
