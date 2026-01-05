import { Button, Card, Modal, Space, Tag, Typography } from "antd";
import React, { useMemo, useRef, useState } from "react";
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
  prominentColor?: string | null;
  enableScreenshotViewer?: boolean;
  tags?: WebsiteCardTag[];
  extra?: React.ReactNode;
  onClick?: () => void;
};

export const WebsiteCard: React.FC<WebsiteCardProps> = ({
  title,
  url,
  description,
  screenshotSrc,
  prominentColor,
  enableScreenshotViewer = false,
  tags = [],
  extra,
  onClick,
}) => {
  const imgSrc = getDisplayImageSrc(screenshotSrc);
  const prominentColorValue = useMemo(() => {
    const value = typeof prominentColor === "string" ? prominentColor.trim() : "";
    return value.length ? value : null;
  }, [prominentColor]);
  const [isHovered, setIsHovered] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const ignoreNextCardClickRef = useRef(false);

  const canPreview = useMemo(() => Boolean(enableScreenshotViewer && screenshotSrc), [enableScreenshotViewer, screenshotSrc]);
  return (
    <Card
      hoverable={!!onClick}
      onClick={() => {
        if (ignoreNextCardClickRef.current) {
          ignoreNextCardClickRef.current = false;
          return;
        }
        onClick?.();
      }}
      cover={
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ position: "relative" }}
        >
          <img
            src={imgSrc}
            alt={`Screenshot for ${title}`}
            style={{
              height: 220,
              width: "100%",
              objectFit: "cover",
              objectPosition: "top",
              display: "block",
            }}
          />

          {canPreview ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                padding: 10,
                background: isHovered ? "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))" : "transparent",
                opacity: isHovered ? 1 : 0,
                transition: "opacity 120ms ease",
                pointerEvents: isHovered ? "auto" : "none",
              }}
            >
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  ignoreNextCardClickRef.current = true;
                  setViewerOpen(true);
                }}
              >
                View screenshot
              </Button>
            </div>
          ) : null}
        </div>
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
        {prominentColorValue ? (
          <Space size={8} align="center">
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: prominentColorValue,
                border: "1px solid rgba(0,0,0,0.15)",
              }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {prominentColorValue}
            </Typography.Text>
          </Space>
        ) : null}
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

      <Modal
        title={title}
        open={viewerOpen}
        onCancel={(e) => {
          e?.stopPropagation?.();
          ignoreNextCardClickRef.current = true;
          setViewerOpen(false);
          window.setTimeout(() => {
            ignoreNextCardClickRef.current = false;
          }, 250);
        }}
        footer={null}
        centered
        width={1240}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            maxHeight: "calc(100vh - 220px)",
            overflowY: "auto",
            overflowX: "auto",
            padding: 16,
            textAlign: "center",
            background: "#0b1020",
          }}
        >
          <img
            src={imgSrc}
            alt={`Full screenshot for ${title}`}
            style={{
              width: "min(100%, 1180px)",
              height: "auto",
              display: "block",
              margin: "0 auto",
              background: "#fff",
              borderRadius: 8,
            }}
          />
        </div>
      </Modal>
    </Card>
  );
};
