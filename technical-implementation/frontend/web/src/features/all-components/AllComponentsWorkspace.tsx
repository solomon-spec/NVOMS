"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ChartTab from "@/components/common/ChartTab";
import ComponentCard from "@/components/common/ComponentCard";
import GridShape from "@/components/common/GridShape";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import Calendar from "@/components/calendar/Calendar";
import BarChartOne from "@/components/charts/bar/BarChartOne";
import LineChartOne from "@/components/charts/line/LineChartOne";
import CountryMap from "@/components/ecommerce/CountryMap";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import DefaultModal from "@/components/example/ModalExample/DefaultModal";
import FormInModal from "@/components/example/ModalExample/FormInModal";
import FullScreenModal from "@/components/example/ModalExample/FullScreenModal";
import ModalBasedAlerts from "@/components/example/ModalExample/ModalBasedAlerts";
import VerticallyCenteredModal from "@/components/example/ModalExample/VerticallyCenteredModal";
import SignInForm from "@/components/auth/SignInForm";
import SignUpForm from "@/components/auth/SignUpForm";
import Form from "@/components/form/Form";
import Label from "@/components/form/Label";
import MultiSelect from "@/components/form/MultiSelect";
import Select from "@/components/form/Select";
import DatePicker from "@/components/form/date-picker";
import CheckboxComponents from "@/components/form/form-elements/CheckboxComponents";
import DefaultInputs from "@/components/form/form-elements/DefaultInputs";
import DropZone from "@/components/form/form-elements/DropZone";
import FileInputExample from "@/components/form/form-elements/FileInputExample";
import InputGroup from "@/components/form/form-elements/InputGroup";
import InputStates from "@/components/form/form-elements/InputStates";
import RadioButtons from "@/components/form/form-elements/RadioButtons";
import SelectInputs from "@/components/form/form-elements/SelectInputs";
import TextAreaInput from "@/components/form/form-elements/TextAreaInput";
import ToggleSwitch from "@/components/form/form-elements/ToggleSwitch";
import PhoneInput from "@/components/form/group-input/PhoneInput";
import Checkbox from "@/components/form/input/Checkbox";
import FileInput from "@/components/form/input/FileInput";
import InputField from "@/components/form/input/InputField";
import Radio from "@/components/form/input/Radio";
import RadioSm from "@/components/form/input/RadioSm";
import TextArea from "@/components/form/input/TextArea";
import Switch from "@/components/form/switch/Switch";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import SidebarWidget from "@/components/layout/SidebarWidget";
import BasicTableOne from "@/components/tables/BasicTableOne";
import Pagination from "@/components/tables/Pagination";
import Alert from "@/components/ui/alert/Alert";
import Avatar from "@/components/ui/avatar/Avatar";
import AvatarText from "@/components/ui/avatar/AvatarText";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import ResponsiveImage from "@/components/ui/images/ResponsiveImage";
import ThreeColumnImageGrid from "@/components/ui/images/ThreeColumnImageGrid";
import TwoColumnImageGrid from "@/components/ui/images/TwoColumnImageGrid";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import VideosExample from "@/components/ui/video/VideosExample";
import YouTubeEmbed from "@/components/ui/video/YouTubeEmbed";
import UserAddressCard from "@/components/user-profile/UserAddressCard";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import FourIsToThree from "@/components/videos/FourIsToThree";
import OneIsToOne from "@/components/videos/OneIsToOne";
import SixteenIsToNine from "@/components/videos/SixteenIsToNine";
import TwentyOneIsToNine from "@/components/videos/TwentyOneIsToNine";

const sectionLinks = [
  { id: "overview", label: "Overview" },
  { id: "shell", label: "Shell" },
  { id: "ui", label: "UI" },
  { id: "forms", label: "Forms" },
  { id: "tables", label: "Tables" },
  { id: "charts", label: "Charts" },
  { id: "calendar", label: "Calendar" },
  { id: "modals", label: "Modals" },
  { id: "auth", label: "Auth" },
  { id: "profile", label: "Profile" },
  { id: "media", label: "Media" },
];

const inventoryGroups = [
  {
    title: "Shell and common",
    detail: "App shell, sidebar widget, breadcrumb, cards, theme toggles, chart tabs.",
  },
  {
    title: "UI primitives",
    detail: "Alerts, avatars, badges, buttons, dropdowns, base modal, image helpers, and video embeds.",
  },
  {
    title: "Form system",
    detail: "Low-level inputs plus the larger template form blocks for selection, upload, state, and scheduling.",
  },
  {
    title: "Data and dashboards",
    detail: "Tables, pagination, charts, metrics, orders, maps, and calendar components.",
  },
  {
    title: "Experience flows",
    detail: "Auth forms, modal examples, notifications, user profile cards, and media ratio examples.",
  },
];

const selectOptions = [
  { value: "bahirdar", label: "Bahir Dar" },
  { value: "addis", label: "Addis Ababa" },
  { value: "hawassa", label: "Hawassa" },
];

const multiSelectOptions = [
  { value: "registry", text: "Child registry", selected: true },
  { value: "inventory", text: "Inventory sync", selected: false },
  { value: "surveillance", text: "Surveillance", selected: false },
  { value: "analytics", text: "Analytics", selected: false },
];

const countryOptions = [
  { code: "US", label: "+1" },
  { code: "ET", label: "+251" },
  { code: "KE", label: "+254" },
];

type GallerySectionProps = {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

function GallerySection({
  id,
  title,
  description,
  children,
}: GallerySectionProps) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export default function AllComponentsWorkspace() {
  const [baseDropdownOpen, setBaseDropdownOpen] = useState(false);
  const [baseModalOpen, setBaseModalOpen] = useState(false);
  const [tablePage, setTablePage] = useState(2);
  const [formSubmissions, setFormSubmissions] = useState(0);
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [radioValue, setRadioValue] = useState("facility");
  const [radioSmValue, setRadioSmValue] = useState("weekly");
  const [textareaValue, setTextareaValue] = useState(
    "Catch-up outreach planned for this week."
  );

  return (
    <>
      <PageBreadcrumb pageTitle="All Components" />

      <div className="space-y-10">
        <GallerySection
          id="overview"
          title="Gallery Overview"
          description="This page turns the imported template component set into one browseable workspace. The shell around this page is also part of the imported component set."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Alert
              variant="success"
              title="Full component gallery is live"
              message="You can now inspect the imported components inside our own app structure instead of jumping through template pages."
            />
            <Alert
              variant="info"
              title="Shell components are already active"
              message="AppSidebar, AppHeader, Backdrop, PageBreadCrumb, and ComponentCard are all being used directly in this frontend."
            />
          </div>

          <ComponentCard
            title="Quick Navigation"
            desc="Jump through the imported component groups without leaving the app."
          >
            <div className="flex flex-wrap gap-3">
              {sectionLinks.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-brand-400"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </ComponentCard>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
            {inventoryGroups.map((group) => (
              <div
                key={group.title}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                  {group.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {group.detail}
                </p>
              </div>
            ))}
          </div>
        </GallerySection>

        <GallerySection
          id="shell"
          title="Shell and Common"
          description="The route shell is already visible around this page. These previews cover the remaining common building blocks and shell-adjacent pieces."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard
              title="Live Shell Components"
              desc="These imported components are active around the gallery right now."
            >
              <div className="flex flex-wrap gap-3">
                <Badge color="primary">AppSidebar</Badge>
                <Badge color="success">AppHeader</Badge>
                <Badge color="info">Backdrop</Badge>
                <Badge color="warning">PageBreadCrumb</Badge>
                <Badge color="dark">ComponentCard</Badge>
              </div>
              <SidebarWidget />
            </ComponentCard>

            <ComponentCard
              title="Theme and Chart Controls"
              desc="These are the smaller common controls imported from the template."
            >
              <div className="flex flex-wrap items-center gap-4">
                <ThemeToggleButton />
                <ThemeTogglerTwo />
              </div>
              <ChartTab />
            </ComponentCard>
          </div>

          <ComponentCard
            title="GridShape"
            desc="Decorative shape asset imported with the reusable component set."
          >
            <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
              <GridShape />
              <div className="relative z-10 max-w-md space-y-2">
                <Badge color="info">Decorative helper</Badge>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Layout accent preview
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This component is best used inside hero sections, auth shells,
                  and background-enhanced cards.
                </p>
              </div>
            </div>
          </ComponentCard>
        </GallerySection>

        <GallerySection
          id="ui"
          title="UI Primitives"
          description="Low-level reusable pieces that can be dropped straight into future medical pages."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard title="Alerts">
              <Alert
                variant="success"
                title="Success"
                message="Routine immunization data was synced successfully."
              />
              <Alert
                variant="warning"
                title="Warning"
                message="Cold-chain audit for three facilities is still pending."
              />
              <Alert
                variant="error"
                title="Error"
                message="One batch export failed and needs a retry."
              />
              <Alert
                variant="info"
                title="Info"
                message="Backend endpoints are still mocked for this view."
                showLink
                linkHref="/all-components#tables"
                linkText="Jump to tables"
              />
            </ComponentCard>

            <ComponentCard title="Buttons, Badges, and Avatars">
              <div className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="outline">Outline</Button>
                <Badge color="primary">Primary</Badge>
                <Badge color="success">Success</Badge>
                <Badge color="warning">Warning</Badge>
                <Badge color="error">Error</Badge>
                <Badge color="dark">Dark</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar
                  src="/images/user/user-01.jpg"
                  alt="Vaccination officer"
                  size="large"
                  status="online"
                />
                <Avatar
                  src="/images/user/user-02.jpg"
                  alt="Field worker"
                  size="xlarge"
                  status="busy"
                />
                <AvatarText name="Abel Dawit" />
                <AvatarText name="Lulit Bekele" className="h-12 w-12" />
              </div>
            </ComponentCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard
              title="Base Dropdown and DropdownItem"
              desc="This section renders the raw dropdown primitives without the template header around them."
            >
              <div className="relative min-h-[220px]">
                <button
                  type="button"
                  onClick={() => setBaseDropdownOpen((open) => !open)}
                  className="dropdown-toggle rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Toggle base dropdown
                </button>
                <Dropdown
                  isOpen={baseDropdownOpen}
                  onClose={() => setBaseDropdownOpen(false)}
                  className="w-64"
                >
                  <div className="py-2">
                    <DropdownItem
                      onItemClick={() => setBaseDropdownOpen(false)}
                      className="px-4 py-3"
                    >
                      Quick action
                    </DropdownItem>
                    <DropdownItem
                      tag="a"
                      href="/all-components#forms"
                      onItemClick={() => setBaseDropdownOpen(false)}
                      className="px-4 py-3"
                    >
                      Open form components
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => setBaseDropdownOpen(false)}
                      className="px-4 py-3 text-brand-600 dark:text-brand-400"
                    >
                      Close menu
                    </DropdownItem>
                  </div>
                </Dropdown>
              </div>
            </ComponentCard>

            <ComponentCard title="Header Dropdown Components">
              <div className="flex min-h-[220px] items-start gap-6 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
                <NotificationDropdown />
                <UserDropdown />
              </div>
            </ComponentCard>
          </div>

          <ComponentCard
            title="Base Modal"
            desc="The raw modal primitive used by the example and profile edit components."
          >
            <Button onClick={() => setBaseModalOpen(true)}>Open base modal</Button>
            <Modal
              isOpen={baseModalOpen}
              onClose={() => setBaseModalOpen(false)}
              className="max-w-[520px] p-6"
            >
              <div className="space-y-4">
                <Badge color="info">Base modal preview</Badge>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Component-level modal
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This is the raw `Modal` component, separate from the packaged
                  examples below.
                </p>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBaseModalOpen(false)}
                  >
                    Close
                  </Button>
                  <Button size="sm" onClick={() => setBaseModalOpen(false)}>
                    Confirm
                  </Button>
                </div>
              </div>
            </Modal>
          </ComponentCard>
        </GallerySection>

        <GallerySection
          id="forms"
          title="Forms and Inputs"
          description="Both the raw primitives and the larger form blocks are rendered here so we can build medical workflows without template pages."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard
              title="Raw Form Primitives"
              desc="These are the lowest-level imported form elements."
            >
              <Form onSubmit={() => setFormSubmissions((count) => count + 1)}>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div className="xl:col-span-2">
                    <Label htmlFor="primitive-name">Form wrapper</Label>
                    <InputField
                      id="primitive-name"
                      placeholder="Future component demo form"
                    />
                  </div>

                  <div>
                    <Label htmlFor="primitive-select">Select</Label>
                    <Select
                      options={selectOptions}
                      placeholder="Choose facility"
                      onChange={() => undefined}
                    />
                  </div>

                  <div>
                    <DatePicker
                      id="primitive-date"
                      label="Date picker"
                      placeholder="Select visit date"
                    />
                  </div>

                  <div className="xl:col-span-2">
                    <MultiSelect
                      label="MultiSelect"
                      options={multiSelectOptions}
                      defaultSelected={["registry", "surveillance"]}
                    />
                  </div>

                  <div className="xl:col-span-2">
                    <Label>PhoneInput</Label>
                    <PhoneInput countries={countryOptions} />
                  </div>

                  <div className="xl:col-span-2">
                    <Label>TextArea</Label>
                    <TextArea
                      rows={4}
                      value={textareaValue}
                      onChange={setTextareaValue}
                      hint="Primitive text area with internal hint support."
                    />
                  </div>

                  <div>
                    <Label>Checkbox</Label>
                    <Checkbox
                      label="Enable reminder"
                      checked={checkboxValue}
                      onChange={setCheckboxValue}
                    />
                  </div>

                  <div>
                    <Label>Switch</Label>
                    <Switch
                      label="Offline mode"
                      defaultChecked
                      color="gray"
                    />
                  </div>

                  <div>
                    <Label>Radio</Label>
                    <div className="space-y-3">
                      <Radio
                        id="radio-facility"
                        name="report-mode"
                        value="facility"
                        label="Facility"
                        checked={radioValue === "facility"}
                        onChange={setRadioValue}
                      />
                      <Radio
                        id="radio-region"
                        name="report-mode"
                        value="region"
                        label="Region"
                        checked={radioValue === "region"}
                        onChange={setRadioValue}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>RadioSm</Label>
                    <div className="space-y-3">
                      <RadioSm
                        id="radio-sm-weekly"
                        name="reporting-frequency"
                        value="weekly"
                        label="Weekly"
                        checked={radioSmValue === "weekly"}
                        onChange={setRadioSmValue}
                      />
                      <RadioSm
                        id="radio-sm-monthly"
                        name="reporting-frequency"
                        value="monthly"
                        label="Monthly"
                        checked={radioSmValue === "monthly"}
                        onChange={setRadioSmValue}
                      />
                    </div>
                  </div>

                  <div className="xl:col-span-2">
                    <Label>FileInput</Label>
                    <FileInput />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <Button size="sm">Submit Form</Button>
                  <Badge color="info">{formSubmissions} submissions</Badge>
                </div>
              </Form>
            </ComponentCard>

            <ComponentCard title="Raw State Variants">
              <div className="space-y-5">
                <div>
                  <Label>Default</Label>
                  <InputField placeholder="Default text input" />
                </div>
                <div>
                  <Label>Success</Label>
                  <InputField
                    defaultValue="BCG recorded"
                    success
                    hint="This field uses the success state."
                  />
                </div>
                <div>
                  <Label>Error</Label>
                  <InputField
                    defaultValue="Invalid batch code"
                    error
                    hint="This field uses the error state."
                  />
                </div>
                <div>
                  <Label>Disabled</Label>
                  <InputField
                    defaultValue="Read-only source"
                    disabled
                    hint="This field is disabled."
                  />
                </div>
              </div>
            </ComponentCard>
          </div>

          <div className="space-y-6">
            <DefaultInputs />
            <InputStates />
            <SelectInputs />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <InputGroup />
              <TextAreaInput />
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <CheckboxComponents />
              <RadioButtons />
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ToggleSwitch />
              <DropZone />
            </div>
            <FileInputExample />
          </div>
        </GallerySection>

        <GallerySection
          id="tables"
          title="Tables and Pagination"
          description="Data-heavy components ready for patient lists, audit logs, and reporting pages."
        >
          <div className="grid grid-cols-1 gap-6">
            <BasicTableOne />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard
              title="Raw Table Primitives"
              desc="The low-level table primitives can be composed directly where we need custom layouts."
            >
              <div className="overflow-x-auto">
                <Table className="min-w-[520px]">
                  <TableHeader className="border-b border-gray-100 dark:border-gray-800">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Queue
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Owner
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-b border-gray-100 dark:border-gray-800">
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        Daily sync
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        Registry service
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge color="success">Healthy</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        Report export
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        Reporting service
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge color="warning">Queued</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </ComponentCard>

            <ComponentCard title="Pagination">
              <Pagination
                currentPage={tablePage}
                totalPages={7}
                onPageChange={setTablePage}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current page: {tablePage}
              </p>
            </ComponentCard>
          </div>
        </GallerySection>

        <GallerySection
          id="charts"
          title="Charts and Dashboard Blocks"
          description="These are the heavier dashboard components imported from the template component set."
        >
          <div className="grid grid-cols-12 gap-4 md:gap-6">
            <div className="col-span-12 space-y-6 xl:col-span-7">
              <EcommerceMetrics />
              <MonthlySalesChart />
            </div>
            <div className="col-span-12 xl:col-span-5">
              <MonthlyTarget />
            </div>
            <div className="col-span-12">
              <StatisticsChart />
            </div>
            <div className="col-span-12 xl:col-span-5">
              <DemographicCard />
            </div>
            <div className="col-span-12 xl:col-span-7">
              <RecentOrders />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard title="LineChartOne">
              <LineChartOne />
            </ComponentCard>
            <ComponentCard title="BarChartOne">
              <BarChartOne />
            </ComponentCard>
          </div>

          <CountryMap />
        </GallerySection>

        <GallerySection
          id="calendar"
          title="Calendar"
          description="The scheduling calendar is imported as a component and works directly in this route."
        >
          <Calendar />
        </GallerySection>

        <GallerySection
          id="modals"
          title="Modal Examples"
          description="Prebuilt example variants that sit on top of the base modal primitive."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard title="Modal Triggers">
              <div className="flex flex-wrap gap-3">
                <DefaultModal />
                <VerticallyCenteredModal />
                <FormInModal />
                <ModalBasedAlerts />
                <FullScreenModal />
              </div>
            </ComponentCard>

            <ComponentCard title="Modal Notes">
              <Alert
                variant="info"
                title="Interactive examples"
                message="These examples use the same imported modal building block and help verify click handling, focus, overlay, and close behaviour."
              />
            </ComponentCard>
          </div>
        </GallerySection>

        <GallerySection
          id="auth"
          title="Auth Forms"
          description="Template auth components are rendered directly here for inspection, while the real app auth routes now live under /auth."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <SignInNotice />
              <SignInForm />
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <SignUpNotice />
              <SignUpForm />
            </div>
          </div>
        </GallerySection>

        <GallerySection
          id="profile"
          title="User Profile Cards"
          description="These imported cards include edit modals, profile metadata, and structured information layouts."
        >
          <div className="space-y-6">
            <UserMetaCard />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <UserInfoCard />
              <UserAddressCard />
            </div>
          </div>
        </GallerySection>

        <GallerySection
          id="media"
          title="Media and Image Components"
          description="Responsive image helpers, raw video embeds, and ratio examples imported as standalone components."
        >
          <div className="grid grid-cols-1 gap-6">
            <ComponentCard title="Image Helpers">
              <ResponsiveImage />
              <TwoColumnImageGrid />
              <ThreeColumnImageGrid />
            </ComponentCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ComponentCard title="Raw YouTubeEmbed">
              <YouTubeEmbed videoId="dQw4w9WgXcQ" title="Base video embed" />
            </ComponentCard>
            <ComponentCard title="Ratio Components">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <OneIsToOne />
                <FourIsToThree />
                <SixteenIsToNine />
                <TwentyOneIsToNine />
              </div>
            </ComponentCard>
          </div>

          <VideosExample />
        </GallerySection>
      </div>
    </>
  );
}

function SignInNotice() {
  return (
    <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
      Sign-in form preview. The production-style page is now available at /auth/sign-in.
    </div>
  );
}

function SignUpNotice() {
  return (
    <div className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
      Sign-up stays as a component preview only. The current app flow uses administrator-managed accounts.
    </div>
  );
}
