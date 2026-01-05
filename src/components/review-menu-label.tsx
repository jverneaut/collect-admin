import type { HttpError } from "@refinedev/core";
import { useCustom } from "@refinedev/core";
import { Badge } from "antd";
import React, { useMemo } from "react";

type ReviewCountResponse = {
  domains: number;
  crawlRuns: number;
};

export const ReviewMenuLabel: React.FC = () => {
  const { result } = useCustom<ReviewCountResponse, HttpError>({
    url: "/admin/review/count",
    method: "get",
    queryOptions: { refetchInterval: 10_000 },
  });

  const count = useMemo(() => {
    const domains = result.data?.domains ?? 0;
    return Math.max(0, Math.min(domains, 99));
  }, [result.data?.domains]);

  return (
    <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
      <span style={{ flex: 1 }}>Reviews</span>
      <Badge count={count} size="small" overflowCount={99} />
    </span>
  );
};

