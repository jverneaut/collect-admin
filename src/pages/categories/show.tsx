import { Show } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { useShow } from "@refinedev/core";
import { Descriptions } from "antd";
import React from "react";
import type { Category } from "../../types/collect";

export const CategoryShow: React.FC = () => {
  const { query, result } = useShow<Category, HttpError>({ resource: "categories" });

  return (
    <Show isLoading={query.isLoading} title={result?.name ?? "Category"}>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="ID">{result?.id ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Name">{result?.name ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Slug">{result?.slug ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Description">{result?.description ?? "-"}</Descriptions.Item>
      </Descriptions>
    </Show>
  );
};

