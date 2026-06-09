/**
 * Deploys the BeaconIncident contract to GenLayer Studio network.
 * Run: node deploy_contract.mjs
 */
import { readFileSync } from "fs";
import { createClient, chains } from "genlayer-js";
import { transactionsStatusNumberToName } from "genlayer-js/types";
import { ethers } from "ethers";

const RPC_URL  = "https://studio.genlayer.com/api";
const DEPLOYER = "0xBC1399c55538eC034d4Da550C03c34Ae0C357f53";
const PRIV_KEY = "0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7";
const POLL_MS  = 5000;
const MAX_POLLS = 120;

async function rpc(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

async function pollStatus(hash) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_MS));
    const tx = await rpc("eth_getTransactionByHash", [hash]).catch(() => null);
    if (!tx) continue;
    const raw = tx.status;
    let name;
    if (typeof raw === "string") name = raw === "ACTIVATED" ? "PENDING" : raw;
    else if (typeof raw === "number") name = transactionsStatusNumberToName[String(raw)] ?? null;
    if (!name) continue;
    process.stdout.write(`  [${i+1}] ${name}   \r`);
    if (["FINALIZED","ACCEPTED"].includes(name)) return "finalized";
    if (["CANCELED"].includes(name)) return "failed";
  }
  return "timeout";
}

async function main() {
  const wallet = new ethers.Wallet(PRIV_KEY);

  const provider = {
    async request({ method, params = [] }) {
      if (method === "eth_sendTransaction") {
        const [tx] = params;
        const nonce = await rpc("eth_getTransactionCount", [DEPLOYER, "latest"]);
        const signed = await wallet.signTransaction({
          to: tx.to ?? null,
          data: tx.data ?? "0x",
          value: tx.value ? BigInt(tx.value) : 0n,
          gasLimit: BigInt(tx.gas ?? "0x4C4B40"),
          gasPrice: BigInt(tx.gasPrice ?? "0x3B9ACA00"),
          nonce: parseInt(nonce, 16),
          chainId: 61999,
        });
        return rpc("eth_sendRawTransaction", [signed]);
      }
      if (method === "eth_estimateGas") return "0x4C4B40";
      return rpc(method, params);
    },
  };

  const client = createClient({
    chain: chains.studionet,
    endpoint: RPC_URL,
    account: DEPLOYER,
    provider,
  });

  const contractCode = readFileSync("contracts/beacon_incident.py", "utf8");

  console.log("Deploying BeaconIncident contract...");
  const deployHash = await client.deployContract({ code: contractCode, args: [] });
  console.log(`  tx: ${deployHash}`);
  const deployResult = await pollStatus(deployHash);
  console.log(`\n  status: ${deployResult}`);

  if (deployResult !== "finalized") {
    console.error("Deploy failed.");
    process.exit(1);
  }

  const receipt = await rpc("eth_getTransactionReceipt", [deployHash]);
  let contractAddress = receipt?.contractAddress;
  if (!contractAddress) {
    // GenLayer returns contract address in to_address on eth_getTransactionByHash
    const txData = await rpc("eth_getTransactionByHash", [deployHash]);
    contractAddress = txData?.to_address ?? txData?.to;
  }
  if (!contractAddress) {
    console.error("Could not determine contract address from receipt or tx data.");
    process.exit(1);
  }

  console.log(`\nBeaconIncident deployed at: ${contractAddress}`);
  console.log("\nAdd to frontend/.env.local:");
  console.log(`NEXT_PUBLIC_BEACON_CONTRACT_ADDRESS=${contractAddress}`);
}

main().catch(console.error);
