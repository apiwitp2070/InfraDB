"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Spacer } from "@heroui/spacer";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";

import { useTokenStorage } from "@/hooks/useTokenStorage";

export default function TokenSettingsPage() {
  const { tokens, setToken, clearTokens, isReady } = useTokenStorage();
  const [gitlabToken, setGitlabToken] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"saved" | "cleared" | null>(
    null
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    setGitlabToken(tokens.gitlab);
    setGithubToken(tokens.github);
  }, [isReady, tokens.github, tokens.gitlab]);

  const hasChanges = useMemo(() => {
    if (!isReady) {
      return false;
    }

    return (
      tokens.gitlab !== gitlabToken.trim() ||
      tokens.github !== githubToken.trim()
    );
  }, [gitlabToken, githubToken, isReady, tokens.github, tokens.gitlab]);

  useEffect(() => {
    if (!feedback) {
      setFeedbackType(null);
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 3000);

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const handleSave = () => {
    setToken("gitlab", gitlabToken.trim());
    setToken("github", githubToken.trim());
    setFeedback("Tokens saved successfully.");
    setFeedbackType("saved");
  };

  const handleClear = () => {
    clearTokens();
    setGitlabToken("");
    setGithubToken("");
    setFeedback("Tokens cleared.");
    setFeedbackType("cleared");
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col items-start gap-1">
          <h1 className="text-xl font-semibold">Personal Access Tokens</h1>
          <p className="text-sm text-default-500">
            Tokens live in this browser's local storage. Provide tokens with the
            required scopes to interact with GitLab and GitHub APIs.
          </p>
        </CardHeader>
        <Divider />
        <CardBody className="gap-6">
          <section className="flex flex-col gap-4">
            <header>
              <h2 className="text-base font-medium">GitLab Token</h2>
              <p className="text-xs text-default-500">
                Needs api scope to manage variables and pipelines.
              </p>
            </header>
            <Input
              isDisabled={!isReady}
              label="GitLab Personal Access Token"
              labelPlacement="outside"
              placeholder="glpat-..."
              type="password"
              value={gitlabToken}
              onValueChange={setGitlabToken}
            />
          </section>

          <Spacer y={2} />

          <section className="flex flex-col gap-4">
            <header>
              <h2 className="text-base font-medium">GitHub Token</h2>
              <p className="text-xs text-default-500">
                Needs repo scope to manage secrets.
              </p>
            </header>
            <Input
              isDisabled={!isReady}
              label="GitHub Personal Access Token"
              labelPlacement="outside"
              placeholder="ghp_..."
              type="password"
              value={githubToken}
              onValueChange={setGithubToken}
            />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {feedback ? (
                <Chip
                  color={feedbackType === "cleared" ? "warning" : "success"}
                  size="sm"
                  variant="flat"
                >
                  {feedback}
                </Chip>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                isDisabled={
                  !isReady || (!tokens.gitlab && !tokens.github)
                }
                variant="light"
                onPress={handleClear}
              >
                Clear
              </Button>
              <Button
                color="primary"
                isDisabled={!isReady || !hasChanges}
                onPress={handleSave}
              >
                Save tokens
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
