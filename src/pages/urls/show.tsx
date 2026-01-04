import { Show } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { useOne } from "@refinedev/core";
import { Descriptions, Space, Tag, Typography } from "antd";
import React, { useMemo } from "react";
import { useParams } from "react-router";
import { UrlCrawlExplorer } from "../../components";
import type { Url } from "../../types/collect";

export const UrlShow: React.FC = () => {
  const { domainId, id } = useParams();
  const urlId = id ?? "";

  const { query: urlQuery, result: url } = useOne<Url>({
    resource: "urls",
    id: urlId,
    meta: { domainId },
    queryOptions: { enabled: Boolean(domainId && urlId) },
  });

  const latest = url?.crawls?.[0];

  const categories = useMemo(
    () => latest?.categories?.map((c) => c.category?.name).filter(Boolean) ?? [],
    [latest?.categories]
  );
  const technologies = useMemo(
    () => latest?.technologies?.map((t) => t.technology?.name).filter(Boolean) ?? [],
    [latest?.technologies]
  );

  return (
    <Show
      isLoading={urlQuery.isLoading}
      title={url?.normalizedUrl ?? "URL"}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Descriptions bordered size="small" column={1} styles={{ content: { wordBreak: "break-word" } }}>
          <Descriptions.Item label="ID">{url?.id ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Domain ID">{url?.domainId ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Type">{url?.type ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Path">{url?.path ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Normalized URL">{url?.normalizedUrl ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Canonical">{url?.isCanonical ? "Yes" : "No"}</Descriptions.Item>
          <Descriptions.Item label="Latest crawl">
            {latest ? (
              <Space>
                <Tag color={latest.status === "SUCCESS" ? "green" : "default"}>{latest.status}</Tag>
                <Typography.Text type="secondary">{new Date(latest.createdAt).toLocaleString()}</Typography.Text>
              </Space>
            ) : (
              "-"
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Latest title">{latest?.title ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Latest final URL">{latest?.finalUrl ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Latest categories">{categories.length ? categories.join(" · ") : "-"}</Descriptions.Item>
          <Descriptions.Item label="Latest technologies">{technologies.length ? technologies.join(" · ") : "-"}</Descriptions.Item>
        </Descriptions>

        <UrlCrawlExplorer urlId={urlId} />
      </Space>
    </Show>
  );
};
