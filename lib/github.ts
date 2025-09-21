export type GitHubRepoRef = {
  owner: string;
  repo: string;
};

const DEFAULT_GITHUB_API = "https://api.github.com";

const buildHeaders = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
});

declare global {
  interface Window {
    nacl?: {
      box: {
        before: (publicKey: Uint8Array, secretKey: Uint8Array) => Uint8Array;
        after: (
          message: Uint8Array,
          nonce: Uint8Array,
          sharedKey: Uint8Array
        ) => Uint8Array;
        keyPair: () => { publicKey: Uint8Array; secretKey: Uint8Array };
        nonceLength: number;
        publicKeyLength: number;
      };
      hash: (input: Uint8Array) => Uint8Array;
      randomBytes: (length: number) => Uint8Array;
    };
  }
}

let naclLoader: Promise<typeof window.nacl> | null = null;

const loadNaCl = async () => {
  if (typeof window === "undefined") {
    throw new Error("Secret encryption only runs in the browser.");
  }

  if (window.nacl) {
    return window.nacl;
  }

  if (!naclLoader) {
    naclLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/tweetnacl.min.js";
      script.async = true;
      script.onload = () => {
        if (window.nacl) {
          resolve(window.nacl);
        } else {
          reject(new Error("Failed to load crypto helper."));
        }
      };
      script.onerror = () => reject(new Error("Failed to load tweetnacl."));
      document.head.appendChild(script);
    });
  }

  return naclLoader;
};

const base64ToUint8Array = (base64: string) => {
  if (typeof window === "undefined") {
    throw new Error("Base64 decoding requires browser runtime.");
  }

  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const uint8ArrayToBase64 = (bytes: Uint8Array) => {
  if (typeof window === "undefined") {
    throw new Error("Base64 encoding requires browser runtime.");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const encryptSecret = async (publicKey: string, secretValue: string) => {
  const nacl = await loadNaCl();

  if (!nacl) {
    throw new Error("Encryption helper unavailable.");
  }

  const publicKeyBytes = base64ToUint8Array(publicKey);
  const messageBytes = new TextEncoder().encode(secretValue);

  const keyPair = nacl.box.keyPair();
  const sharedKey = nacl.box.before(publicKeyBytes, keyPair.secretKey);

  const nonceInput = new Uint8Array(
    keyPair.publicKey.length + publicKeyBytes.length
  );
  nonceInput.set(keyPair.publicKey);
  nonceInput.set(publicKeyBytes, keyPair.publicKey.length);

  const digest = nacl.hash(nonceInput);
  const nonce = digest.slice(0, nacl.box.nonceLength);

  const cipher = nacl.box.after(messageBytes, nonce, sharedKey);
  const sealed = new Uint8Array(keyPair.publicKey.length + cipher.length);
  sealed.set(keyPair.publicKey);
  sealed.set(cipher, keyPair.publicKey.length);

  return uint8ArrayToBase64(sealed);
};

type GitHubRequestInit = RequestInit & { baseUrl?: string };

const request = async <T>(
  path: string,
  token: string,
  { baseUrl = DEFAULT_GITHUB_API, ...init }: GitHubRequestInit = {}
): Promise<T> => {
  const url = `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...buildHeaders(token),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `GitHub request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

type PublicKeyResponse = {
  key_id: string;
  key: string;
};

type FetchPublicKeyInput = GitHubRepoRef & {
  token: string;
  baseUrl?: string;
};

export const fetchGitHubPublicKey = async ({
  owner,
  repo,
  token,
  baseUrl,
}: FetchPublicKeyInput) => {
  return request<PublicKeyResponse>(
    `/repos/${owner}/${repo}/actions/secrets/public-key`,
    token,
    { baseUrl }
  );
};

type UpsertSecretInput = GitHubRepoRef & {
  token: string;
  name: string;
  value: string;
  baseUrl?: string;
};

export const upsertGitHubSecret = async ({
  owner,
  repo,
  name,
  value,
  token,
  baseUrl,
}: UpsertSecretInput) => {
  const publicKey = await fetchGitHubPublicKey({
    owner,
    repo,
    token,
    baseUrl,
  });
  const encryptedValue = await encryptSecret(publicKey.key, value);

  await request(`/repos/${owner}/${repo}/actions/secrets/${name}`, token, {
    baseUrl,
    method: "PUT",
    body: JSON.stringify({
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id,
    }),
  });
};

export const githubApiBaseUrl = DEFAULT_GITHUB_API;

type RepoParseResult = {
  owner: string;
  repo: string;
};

export const parseRepositoryInput = (input: string): RepoParseResult | null => {
  const [owner, repo, ...rest] = input.split("/").map((segment) => segment.trim());

  if (!owner || !repo || rest.length) {
    return null;
  }

  return { owner, repo };
};
