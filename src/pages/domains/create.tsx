import { Create, useForm } from "@refinedev/antd";
import type { HttpError } from "@refinedev/core";
import { Collapse, Form, Input, InputNumber, Select, Switch } from "antd";
import React from "react";
import type { Domain } from "../../types/collect";

type DomainCreateVariables = {
  domain: string;
  createHomepageUrl: boolean;
  createInitialCrawl: boolean;
  enqueueIngestion: boolean;
  ingestion?: {
    maxUrls?: number;
    urlConcurrency?: number;
    screenshot?: {
      format?: "png" | "jpeg";
      fullPage?: boolean;
      adblock?: boolean;
      waitMs?: number;
      timeoutMs?: number;
    };
    technologies?: {
      timeoutMs?: number;
    };
  };
};

export const DomainCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm<Domain, HttpError, DomainCreateVariables>({
    resource: "domains",
    redirect: "show",
  });

  return (
    <Create saveButtonProps={saveButtonProps} title="Add domain">
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          createHomepageUrl: false,
          createInitialCrawl: false,
          enqueueIngestion: true,
          ingestion: {
            maxUrls: 20,
            urlConcurrency: 3,
            screenshot: {
              format: "png",
              fullPage: true,
              adblock: true,
              waitMs: 500,
              timeoutMs: 90000,
            },
            technologies: {
              timeoutMs: 60000,
            },
          },
        }}
      >
        <Form.Item
          label="Domain"
          name="domain"
          rules={[{ required: true, message: "Domain is required" }]}
        >
          <Input placeholder="example.com" />
        </Form.Item>
        <Form.Item label="Create homepage URL" name="createHomepageUrl" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="Create initial crawl" name="createInitialCrawl" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="Enqueue ingestion job" name="enqueueIngestion" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Collapse
          items={[
            {
              key: "ingestion",
              label: "Ingestion options",
              children: (
                <>
                  <Form.Item label="Max URLs" name={["ingestion", "maxUrls"]}>
                    <InputNumber min={1} max={200} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item label="URL concurrency" name={["ingestion", "urlConcurrency"]}>
                    <InputNumber min={1} max={20} style={{ width: "100%" }} />
                  </Form.Item>

                  <Form.Item label="Screenshot format" name={["ingestion", "screenshot", "format"]}>
                    <Select
                      options={[
                        { label: "PNG", value: "png" },
                        { label: "JPEG", value: "jpeg" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item label="Full page screenshot" name={["ingestion", "screenshot", "fullPage"]} valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item label="Adblock" name={["ingestion", "screenshot", "adblock"]} valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item label="Wait (ms)" name={["ingestion", "screenshot", "waitMs"]}>
                    <InputNumber min={0} max={60000} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item label="Screenshot timeout (ms)" name={["ingestion", "screenshot", "timeoutMs"]}>
                    <InputNumber min={1000} max={300000} style={{ width: "100%" }} />
                  </Form.Item>

                  <Form.Item label="Technologies timeout (ms)" name={["ingestion", "technologies", "timeoutMs"]}>
                    <InputNumber min={1000} max={300000} style={{ width: "100%" }} />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
      </Form>
    </Create>
  );
};
