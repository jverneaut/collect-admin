import { Show } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { useShow } from "@refinedev/core";
import { Card, Descriptions, Space, Tag, Typography } from "antd";
import React, { useMemo } from "react";
import type { Job } from "../../types/collect";

function stageFromProgress(progress: unknown) {
  if (!progress || typeof progress !== "object") return "-";
  const stage = (progress as { stage?: unknown }).stage;
  return typeof stage === "string" ? stage : "-";
}

function isActive(status: string) {
  return status === "QUEUED" || status === "RUNNING";
}

export const JobShow: React.FC = () => {
  const { query, result } = useShow<Job, HttpError>({
    resource: "jobs",
    queryOptions: {
      refetchInterval: (q) => {
        const status = (q.state.data?.data as Job | undefined)?.status;
        return status && isActive(status) ? 1000 : 5000;
      },
    },
  });

  const stage = useMemo(() => stageFromProgress(result?.progress), [result?.progress]);

  return (
    <Show isLoading={query.isLoading} title={result ? `${result.type} · ${result.status}` : "Job"}>
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Descriptions bordered size="small" column={1} styles={{ content: { wordBreak: "break-word" } }}>
          <Descriptions.Item label="ID">{result?.id ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Type">{result?.type ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Status">
            {result?.status ? (
              <Tag color={result.status === "SUCCEEDED" ? "green" : result.status === "FAILED" ? "red" : result.status === "RUNNING" ? "blue" : "default"}>
                {result.status}
              </Tag>
            ) : (
              "-"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Stage">
            <Tag>{stage}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Created">{result?.createdAt ? new Date(result.createdAt).toLocaleString() : "-"}</Descriptions.Item>
          <Descriptions.Item label="Started">{result?.startedAt ? new Date(result.startedAt).toLocaleString() : "-"}</Descriptions.Item>
          <Descriptions.Item label="Finished">{result?.finishedAt ? new Date(result.finishedAt).toLocaleString() : "-"}</Descriptions.Item>
          <Descriptions.Item label="Error">{result?.error?.message ?? "-"}</Descriptions.Item>
        </Descriptions>

        <Card size="small" title="Input">
          <pre style={{ margin: 0, overflow: "auto" }}>{JSON.stringify(result?.input ?? null, null, 2)}</pre>
        </Card>
        <Card size="small" title="Progress">
          <pre style={{ margin: 0, overflow: "auto" }}>{JSON.stringify(result?.progress ?? null, null, 2)}</pre>
        </Card>
        <Card size="small" title="Result">
          {result?.result ? (
            <pre style={{ margin: 0, overflow: "auto" }}>{JSON.stringify(result.result, null, 2)}</pre>
          ) : (
            <Typography.Text type="secondary">No result yet</Typography.Text>
          )}
        </Card>
      </Space>
    </Show>
  );
};

