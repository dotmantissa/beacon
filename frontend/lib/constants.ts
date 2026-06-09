// GenLayer Studio network
export const CHAIN_ID = 61999;
export const RPC_URL = "https://studio.genlayer.com/api";

// Contract address — populated after deployment
export const BEACON_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_BEACON_CONTRACT_ADDRESS ?? "";

// Transaction polling
export const TX_POLL_INTERVAL = 3000;
export const TX_POLL_RETRIES = 200;

export const INCIDENT_TYPES = [
  { value: "antisocial_behaviour", label: "Antisocial Behaviour" },
  { value: "criminal_damage", label: "Criminal Damage" },
  { value: "theft", label: "Theft" },
  { value: "vehicle_crime", label: "Vehicle Crime" },
  { value: "assault", label: "Assault" },
  { value: "drug_offences", label: "Drug Offences" },
  { value: "fly_tipping", label: "Fly Tipping" },
  { value: "noise_nuisance", label: "Noise Nuisance" },
  { value: "public_safety", label: "Public Safety Hazard" },
  { value: "road_hazard", label: "Road Hazard" },
  { value: "infrastructure", label: "Infrastructure Failure" },
  { value: "other", label: "Other" },
];

export const SEVERITY_LEVELS = [
  { value: "low", label: "Low", color: "#22c55e" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "high", label: "High", color: "#ef4444" },
  { value: "critical", label: "Critical", color: "#7c3aed" },
];

export const INCIDENT_STATUS = {
  0: { label: "Pending", color: "#f59e0b" },
  1: { label: "Verified", color: "#37ab2f" },
  2: { label: "Disputed", color: "#ef4444" },
  3: { label: "Closed", color: "#6b7280" },
} as const;
