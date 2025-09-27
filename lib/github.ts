import sodium from "libsodium-wrappers";

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

const encryptSecret = async (publicKey: string, secretValue: string) => {
  const secret = secretValue;
  const key = publicKey;

  const output = await sodium.ready.then(() => {
    // Convert the secret and key to a Uint8Array.
    let binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
    let binsec = sodium.from_string(secret);

    // Encrypt the secret using libsodium
    let encBytes = sodium.crypto_box_seal(binsec, binkey);

    // Convert the encrypted Uint8Array to Base64
    let output = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

    // Print the output
    // console.log(output);

    return output;
  });

  return output;
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
      owner,
      repo,
      secret_name: name,
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
  const [owner, repo, ...rest] = input
    .split("/")
    .map((segment) => segment.trim());

  if (!owner || !repo || rest.length) {
    return null;
  }

  return { owner, repo };
};
