import { List } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { useList, useNavigation } from "@refinedev/core";
import { Button, Space, Table, Tag, Typography } from "antd";
import React, { useMemo } from "react";
import { Link } from "react-router";
import type { Job } from "../../types/collect";

function stageFromProgress(progress: unknown) {
  if (!progress || typeof progress !== "object") return "-";
  const stage = (progress as { stage?: unknown }).stage;
  return typeof stage === "string" ? stage : "-";
}

function domainIdFromInput(input: unknown) {
  if (!input || typeof input !== "object") return null;
  const domainId = (input as { domainId?: unknown }).domainId;
  return typeof domainId === "string" ? domainId : null;
}

export const JobList: React.FC = () => {
  const { show } = useNavigation();

  const { query, result } = useList<Job, HttpError>({
    resource: "jobs",
    pagination: { mode: "off" },
    queryOptions: { refetchInterval: 2000 },
  });

  const jobs = useMemo(() => result.data ?? [], [result.data]);

  return (
    <List
      title="Jobs"
      headerButtons={() => (
        <Space>
          <Button onClick={() => query.refetch()} loading={query.isFetching}>
            Refresh
          </Button>
        </Space>
      )}
    >
      <Table<Job>
        rowKey="id"
        loading={query.isLoading}
        dataSource={jobs}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: "Type", dataIndex: "type", key: "type" },
          {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (value: Job["status"]) => (
              <Tag color={value === "SUCCEEDED" ? "green" : value === "FAILED" ? "red" : value === "RUNNING" ? "blue" : "default"}>
                {value}
              </Tag>
            ),
          },
          { title: "Stage", key: "stage", render: (_, record) => <Tag>{stageFromProgress(record.progress)}</Tag> },
          {
            title: "Domain",
            key: "domainId",
            render: (_, record) => {
              const domainId = domainIdFromInput(record.input);
              return domainId ? <Link to={`/domains/show/${domainId}`}>Open domain</Link> : "-";
            },
          },
          { title: "Created", dataIndex: "createdAt", key: "createdAt", render: (v: string) => new Date(v).toLocaleString() },
          {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
              <Space>
                <Button size="small" onClick={() => show("jobs", record.id)}>
                  View
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </List>
  );
};
