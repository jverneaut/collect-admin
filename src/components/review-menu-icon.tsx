import { EyeOutlined } from "@ant-design/icons";
import type { HttpError } from "@refinedev/core";
import { useCustom } from "@refinedev/core";
import { Badge } from "antd";
import React, { useMemo } from "react";

type ReviewCountResponse = {
  domains: number;
  crawlRuns: number;
};

export const ReviewMenuIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => {
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
    <span className={className} style={{ display: "inline-flex", alignItems: "center", ...(style ?? {}) }}>
      <EyeOutlined />
      <span className="collect-review-menu-badge">
        <Badge count={count} size="small" overflowCount={99} />
      </span>
    </span>
  );
};
