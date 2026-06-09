import { createClient, chains } from "genlayer-js";
import type { GenLayerClient, Hash } from "genlayer-js/types";
import { CalldataAddress, TransactionStatus, transactionsStatusNumberToName } from "genlayer-js/types";
import { BEACON_CONTRACT_ADDRESS, RPC_URL, TX_POLL_INTERVAL, TX_POLL_RETRIES } from "@/lib/constants";

export type TxReceipt = {
  status: "pending" | "finalized" | "failed";
  hash: string;
  result?: unknown;
};

export type Incident = {
  id: string;
  type: string;
  description: string;
  location: { lat: string; lng: string; label: string };
  neighbourhood_id: string;
  evidence_urls: string[];
  severity: string;
  submitter: string;
  submitted_at: string;
  status: string;
  status_code: number;
  corroboration_count: number;
  authority_reference?: string;
  authority_received_at?: string;
};

export type ValidationResult = {
  status: string;
  confidence: number;
  reasoning: string;
  evidence_score: number;
  keyword_hits: number;
  council_data_consulted: boolean;
  validated_at: string;
};

function toCalldataAddress(hexAddress: string): CalldataAddress {
  const clean = hexAddress.replace(/^0x/i, "");
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return new CalldataAddress(bytes);
}

let readClient: GenLayerClient<never>;

function getReadClient(): GenLayerClient<never> {
  if (!readClient) {
    readClient = createClient({
      chain: chains.studionet,
      endpoint: RPC_URL,
    }) as unknown as GenLayerClient<never>;
  }
  return readClient;
}

function buildSelectiveProvider(
  walletProvider: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }
) {
  return {
    async request({ method, params = [] }: { method: string; params?: unknown[] }) {
      if (method === "eth_sendTransaction") {
        return walletProvider.request({ method, params });
      }
      if (method === "eth_estimateGas") return "0x4C4B40";
      if (method === "eth_getTransactionReceipt") {
        try {
          const res = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
          });
          const data = await res.json() as { result?: unknown; error?: unknown };
          if (data.error) return null;
          return data.result;
        } catch {
          return null;
        }
      }
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      });
      const data = await res.json() as { result?: unknown; error?: { message?: string } };
      if (data.error) throw data.error;
      return data.result;
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createWriteClient(walletAddress: string, walletProvider: any): GenLayerClient<never> {
  return createClient({
    chain: chains.studionet,
    endpoint: RPC_URL,
    account: walletAddress as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider: buildSelectiveProvider(walletProvider) as any,
  }) as unknown as GenLayerClient<never>;
}

async function fetchRawTxStatus(hash: string): Promise<TransactionStatus | null> {
  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [hash] }),
    });
    const data = await res.json() as { result?: Record<string, unknown> | null };
    const tx = data.result;
    if (!tx) return null;
    const raw = tx.status;
    if (typeof raw === "string") {
      const normalized = raw === "ACTIVATED" ? "PENDING" : raw;
      return normalized as unknown as TransactionStatus;
    }
    if (typeof raw === "number") {
      const name = transactionsStatusNumberToName[String(raw) as keyof typeof transactionsStatusNumberToName];
      return name ? (name as unknown as TransactionStatus) : null;
    }
    return null;
  } catch {
    return null;
  }
}

const SUCCESS_STATUSES = new Set<TransactionStatus>([TransactionStatus.FINALIZED, TransactionStatus.ACCEPTED]);
const FAILED_STATUSES  = new Set<TransactionStatus>([TransactionStatus.CANCELED]);

async function pollGenLayerTx(hash: Hash): Promise<TxReceipt> {
  for (let i = 0; i < TX_POLL_RETRIES; i++) {
    await new Promise((r) => setTimeout(r, TX_POLL_INTERVAL));
    try {
      const statusName = await fetchRawTxStatus(hash as string);
      if (statusName && SUCCESS_STATUSES.has(statusName)) return { status: "finalized", hash };
      if (statusName && FAILED_STATUSES.has(statusName))  return { status: "failed",    hash };
    } catch {
      // keep polling
    }
  }
  return { status: "pending", hash };
}

/* ── Reads ─────────────────────────────────────────────────────────── */

export async function readIncident(incidentId: string): Promise<Incident | null> {
  if (!BEACON_CONTRACT_ADDRESS) return null;
  const client = getReadClient();
  try {
    const raw = await client.readContract({
      address: BEACON_CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_incident",
      args: [incidentId],
    });
    if (typeof raw === "string") return JSON.parse(raw) as Incident;
    return null;
  } catch { return null; }
}

export async function readIncidentValidation(incidentId: string): Promise<ValidationResult | null> {
  if (!BEACON_CONTRACT_ADDRESS) return null;
  const client = getReadClient();
  try {
    const raw = await client.readContract({
      address: BEACON_CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_incident_validation",
      args: [incidentId],
    });
    if (typeof raw === "string") return JSON.parse(raw) as ValidationResult;
    return null;
  } catch { return null; }
}

export async function readUserIncidents(address: string): Promise<string[]> {
  if (!BEACON_CONTRACT_ADDRESS) return [];
  const client = getReadClient();
  try {
    const raw = await client.readContract({
      address: BEACON_CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_user_incidents",
      args: [toCalldataAddress(address)],
    });
    if (typeof raw === "string") return JSON.parse(raw) as string[];
    return [];
  } catch { return []; }
}

export async function readNeighbourhoodIncidents(neighbourhoodId: string): Promise<string[]> {
  if (!BEACON_CONTRACT_ADDRESS) return [];
  const client = getReadClient();
  try {
    const raw = await client.readContract({
      address: BEACON_CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_neighbourhood_incidents",
      args: [neighbourhoodId],
    });
    if (typeof raw === "string") return JSON.parse(raw) as string[];
    return [];
  } catch { return []; }
}

export async function readTotalIncidents(): Promise<number> {
  if (!BEACON_CONTRACT_ADDRESS) return 0;
  const client = getReadClient();
  try {
    const raw = await client.readContract({
      address: BEACON_CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_total_incidents",
      args: [],
    });
    return typeof raw === "number" || typeof raw === "bigint" ? Number(raw) : 0;
  } catch { return 0; }
}

/* ── Writes ────────────────────────────────────────────────────────── */

export async function submitIncident(
  walletAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletProvider: any,
  params: {
    incident_type: string;
    description: string;
    location_lat: string;
    location_lng: string;
    location_label: string;
    neighbourhood_id: string;
    evidence_urls: string[];
    severity: string;
  }
): Promise<TxReceipt> {
  const client = createWriteClient(walletAddress, walletProvider);
  const txId = await client.writeContract({
    address: BEACON_CONTRACT_ADDRESS as `0x${string}`,
    functionName: "submit_incident",
    args: [
      params.incident_type,
      params.description,
      params.location_lat,
      params.location_lng,
      params.location_label,
      params.neighbourhood_id,
      JSON.stringify(params.evidence_urls.filter(u => !u.startsWith("data:"))),
      params.severity,
    ],
    value: BigInt(0),
  });
  return pollGenLayerTx(txId as Hash);
}

export async function corroborateIncident(
  walletAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletProvider: any,
  incidentId: string,
  statement: string
): Promise<TxReceipt> {
  const client = createWriteClient(walletAddress, walletProvider);
  const txId = await client.writeContract({
    address: BEACON_CONTRACT_ADDRESS as `0x${string}`,
    functionName: "corroborate_incident",
    args: [incidentId, statement],
    value: BigInt(0),
  });
  return pollGenLayerTx(txId as Hash);
}

export async function markAuthorityReceived(
  walletAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletProvider: any,
  incidentId: string,
  authorityReference: string
): Promise<TxReceipt> {
  const client = createWriteClient(walletAddress, walletProvider);
  const txId = await client.writeContract({
    address: BEACON_CONTRACT_ADDRESS as `0x${string}`,
    functionName: "mark_authority_received",
    args: [incidentId, authorityReference],
    value: BigInt(0),
  });
  return pollGenLayerTx(txId as Hash);
}
