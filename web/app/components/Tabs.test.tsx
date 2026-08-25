import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "./Tabs";

test("shows first tab by default and switches on click", () => {
  render(
    <Tabs
      items={[
        { key: "a", label: "Alpha", content: <div>ALPHA BODY</div> },
        { key: "b", label: "Beta", content: <div>BETA BODY</div> },
      ]}
    />
  );
  expect(screen.getByText("ALPHA BODY")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Beta" }));
  expect(screen.getByText("BETA BODY")).toBeInTheDocument();
});
