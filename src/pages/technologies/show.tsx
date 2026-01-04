import { Show } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { useShow } from "@refinedev/core";
import { Descriptions, Typography } from "antd";
import React from "react";
import type { Technology } from "../../types/collect";

export const TechnologyShow: React.FC = () => {
  const { query, result } = useShow<Technology, HttpError>({ resource: "technologies" });

  return (
    <Show isLoading={query.isLoading} title={result?.name ?? "Technology"}>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="ID">{result?.id ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Name">{result?.name ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Slug">{result?.slug ?? "-"}</Descriptions.Item>
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

