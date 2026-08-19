Something happened on your street.

You saw it. You know what you saw. But by the time it reaches anyone who could do something about it, it has been rewritten three times, buried in a Facebook thread, and quietly not followed up on.

Beacon is for that.

---

You submit what happened with a precise location, your own account in your own words, and optional committed photos. GenLayer validators independently fetch the submitted evidence, verify its SHA-256 commitment, and assess it alongside relevant public police records. Descriptions and corroboration statements are context, not proof: an incident only becomes `VERIFIED` when consensus finds incident-specific support in both the authenticated evidence and public-record snapshot.

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
DEPLOYER_PRIVATE_KEY=... node deploy_contract.mjs
# copy the address into frontend/.env.local as NEXT_PUBLIC_BEACON_CONTRACT_ADDRESS
```

---

Built on GenLayer Studio. Every incident verification is an AI-executed transaction on-chain, not a backend you have to trust.
