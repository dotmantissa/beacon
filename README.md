Something happened on your street.

You saw it. You know what you saw. But by the time it reaches anyone who could do something about it, it has been rewritten three times, buried in a Facebook thread, and quietly not followed up on.

Beacon is for that.

---

You submit what happened. Photos, video, a precise location, your own account in your own words. The AI cross-references it against public council and police records, checks for corroboration from other residents, and assigns a verification confidence score. If it checks out, it goes on-chain. Immutable. Timestamped. Impossible to claim was never reported.

The local authority gets a structured incident record. The neighbourhood gets a public, searchable history. Patterns in the data surface automatically. And the burden of proof shifts where it belongs.

---

How to run it locally:

```
cd frontend
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

How to deploy the contract:

```
node deploy_contract.mjs
# copy the address into frontend/.env.local as NEXT_PUBLIC_BEACON_CONTRACT_ADDRESS
```

---

Built on GenLayer Studio. Every incident verification is an AI-executed transaction on-chain, not a backend you have to trust.
