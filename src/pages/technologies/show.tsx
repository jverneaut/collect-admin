import { Show } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { useShow } from "@refinedev/core";
import { Descriptions, Space, Typography } from "antd";
import React from "react";
import type { Technology } from "../../types/collect";
import { getDisplayImageSrc } from "../../lib/media";

export const TechnologyShow: React.FC = () => {
  const { query, result } = useShow<Technology, HttpError>({ resource: "technologies" });

  return (
    <Show isLoading={query.isLoading} title={result?.name ?? "Technology"}>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="ID">{result?.id ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Name">{result?.name ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Slug">{result?.slug ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Icon">
          {result?.iconPublicUrl ? (
            <Space size={10}>
              <img
                src={getDisplayImageSrc(result.iconPublicUrl, { placeholder: "/placeholder-site.svg" })}
                alt=""
                width={24}
                height={24}
                style={{ display: "block" }}
              />
              <Typography.Text type="secondary">{result.iconPublicUrl}</Typography.Text>
            </Space>
          ) : (
            "-"
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Website">
          {result?.websiteUrl ? (
            <Typography.Link href={result.websiteUrl} target="_blank" rel="noreferrer">
              {result.websiteUrl}
            </Typography.Link>
          ) : (
            "-"
          )}
        </Descriptions.Item>
      </Descriptions>
    </Show>
  );
};
