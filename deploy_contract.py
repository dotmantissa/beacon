"""
Deploy BeaconIncident to studionet using genlayer_py (Python, avoids Node.js networking issues).

Usage:
  python3 deploy_contract.py
"""
import os
import sys
import time
from pathlib import Path

from eth_account import Account
from genlayer_py.chains import studionet
from genlayer_py.client import GenLayerClient
from genlayer_py.types import TransactionStatus

PRIV_KEY = os.environ.get("DEPLOYER_PRIVATE_KEY")
CONTRACT_FILE = Path("contracts/beacon_incident.py")
POLL_INTERVAL = 6000   # ms
POLL_RETRIES  = 60


def main():
    if not PRIV_KEY:
        print("ERROR: set DEPLOYER_PRIVATE_KEY env var before deploying.", file=sys.stderr)
        sys.exit(1)

    account = Account.from_key(PRIV_KEY)
    print(f"Deployer: {account.address}")

    client = GenLayerClient(chain_config=studionet, account=account)
    code = CONTRACT_FILE.read_text()

    print("Deploying BeaconIncident…")
    tx_hash = client.deploy_contract(code=code, args=[])
    print(f"  tx: {tx_hash}")

    print("  Waiting for finalization…", end="", flush=True)
    receipt = client.wait_for_transaction_receipt(
        transaction_hash=tx_hash,
        status=TransactionStatus.FINALIZED,
        interval=POLL_INTERVAL,
        retries=POLL_RETRIES,
    )
    print()

    # Contract address lives in contract_address or to_address depending on version
    addr = getattr(receipt, "contract_address", None) or getattr(receipt, "to_address", None)
    if not addr and isinstance(receipt, dict):
        addr = receipt.get("contract_address") or receipt.get("to_address")

    if not addr:
        print("ERROR: could not extract contract address from receipt:", receipt, file=sys.stderr)
        sys.exit(1)

    print(f"\nBeaconIncident deployed at: {addr}")
    print(f"\nAdd to frontend/.env.local:")
    print(f"NEXT_PUBLIC_BEACON_CONTRACT_ADDRESS={addr}")


if __name__ == "__main__":
    main()
