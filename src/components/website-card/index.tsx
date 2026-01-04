import { Card, Space, Tag, Typography } from "antd";
import React from "react";
import { getDisplayImageSrc } from "../../lib/media";

type WebsiteCardTag = {
  label: string;
  color?: string;
};

export type WebsiteCardProps = {
  title: string;
  url: string;
  description?: string | null;
  screenshotSrc?: string;
  tags?: WebsiteCardTag[];
  extra?: React.ReactNode;
  onClick?: () => void;
};

export const WebsiteCard: React.FC<WebsiteCardProps> = ({
  title,
  url,
  description,
  screenshotSrc,
  tags = [],
  extra,
  onClick,
}) => {
  const imgSrc = getDisplayImageSrc(screenshotSrc);
  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      cover={
        <img
          src={imgSrc}
          alt={`Screenshot for ${title}`}
          style={{
            height: 180,
            width: "100%",
            objectFit: "cover",
            objectPosition: "top",
          }}
        />
      }
      styles={{ body: { padding: 16 } }}
      actions={extra ? [extra] : undefined}
    >
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Typography.Text strong ellipsis={{ tooltip: title }}>
            {title}
          </Typography.Text>
          <Typography.Text type="secondary" ellipsis={{ tooltip: url }}>
            {url}
          </Typography.Text>
        </Space>
        {description ? (
          <Typography.Paragraph
            type="secondary"
            ellipsis={{ rows: 2, tooltip: description }}
            style={{ marginBottom: 0 }}
          >
            {description}
          </Typography.Paragraph>
        ) : null}
        {tags.length ? (
          <Space size={[6, 6]} wrap>
            {tags.map((tag) => (
              <Tag key={tag.label} color={tag.color}>
                {tag.label}
              </Tag>
            ))}
          </Space>
        ) : null}
      </Space>
    </Card>
  );
};
