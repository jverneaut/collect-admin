import { Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import { ErrorComponent, ThemedLayout } from "@refinedev/antd";
import { useNotificationProvider } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerProvider, {
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { App as AntdApp } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import {
  AppstoreOutlined,
  DashboardOutlined,
  GlobalOutlined,
  PlayCircleOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { Header } from "./components";
import { authProvider } from "./providers/authProvider";
import { collectApiDataProvider } from "./providers/collectApiDataProvider";
import {
  CategoryCreate,
  CategoryEdit,
  CategoryList,
  CategoryShow,
  Dashboard,
  DomainCreate,
  DomainList,
  DomainShow,
  JobList,
  JobShow,
  ReviewList,
  TechnologyCreate,
  TechnologyEdit,
  TechnologyList,
  TechnologyShow,
  UrlShow,
} from "./pages";
import { ReviewMenuIcon } from "./components/review-menu-icon";

function App() {
  const apiUrl = import.meta.env.VITE_COLLECT_API_URL ?? "http://localhost:3000";

  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
            <AntdApp>
            <style>
              {`
                .ant-menu .ant-menu-item { position: relative; }
                .collect-review-menu-badge { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; }
                .ant-menu-inline-collapsed .collect-review-menu-badge { display: none; }
              `}
            </style>
            <DevtoolsProvider>
              <Refine
                dataProvider={collectApiDataProvider(apiUrl)}
                authProvider={authProvider}
                notificationProvider={useNotificationProvider}
                routerProvider={routerProvider}
                resources={[
                  {
                    name: "dashboard",
                    list: "/dashboard",
                    meta: { icon: <DashboardOutlined /> },
                  },
                  {
                    name: "review",
                    list: "/review",
                    meta: { icon: <ReviewMenuIcon />, label: "Reviews" },
                  },
                  {
                    name: "domains",
                    list: "/domains",
                    create: "/domains/create",
                    show: "/domains/show/:id",
                    meta: { icon: <GlobalOutlined /> },
                  },
                  {
                    name: "categories",
                    list: "/categories",
                    create: "/categories/create",
                    edit: "/categories/edit/:id",
                    show: "/categories/show/:id",
                    meta: { icon: <TagsOutlined /> },
                  },
                  {
                    name: "technologies",
                    list: "/technologies",
                    create: "/technologies/create",
                    edit: "/technologies/edit/:id",
                    show: "/technologies/show/:id",
                    meta: { icon: <AppstoreOutlined /> },
                  },
                  {
                    name: "jobs",
                    list: "/jobs",
                    show: "/jobs/show/:id",
                    meta: { icon: <PlayCircleOutlined /> },
                  },
                  {
                    name: "urls",
                    show: "/domains/:domainId/urls/show/:id",
                    meta: { hide: true },
                  },
                  {
                    name: "crawls",
                    meta: { hide: true },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  projectId: "srAcwd-fVYFkd-xlvM8B",
                }}
              >
                <Routes>
                  <Route
                    element={
                      <ThemedLayout Header={Header}>
                        <Outlet />
                      </ThemedLayout>
                    }
                  >
                    <Route index element={<NavigateToResource resource="dashboard" />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/review" element={<ReviewList />} />
                    <Route path="/domains">
                      <Route index element={<DomainList />} />
                      <Route path="create" element={<DomainCreate />} />
                      <Route path="show/:id" element={<DomainShow />} />
                    </Route>
                    <Route path="/categories">
                      <Route index element={<CategoryList />} />
                      <Route path="create" element={<CategoryCreate />} />
                      <Route path="edit/:id" element={<CategoryEdit />} />
                      <Route path="show/:id" element={<CategoryShow />} />
                    </Route>
                    <Route path="/technologies">
                      <Route index element={<TechnologyList />} />
                      <Route path="create" element={<TechnologyCreate />} />
                      <Route path="edit/:id" element={<TechnologyEdit />} />
                      <Route path="show/:id" element={<TechnologyShow />} />
                    </Route>
                    <Route path="/jobs">
                      <Route index element={<JobList />} />
                      <Route path="show/:id" element={<JobShow />} />
                    </Route>
                    <Route path="/domains/:domainId/urls/show/:id" element={<UrlShow />} />
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                </Routes>
                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
