import { render, screen } from "@testing-library/react";
import { OverlayProvider, useOverlay } from "./OverlayContext";

function Consumer() {
  const { openManager, openTrophy } = useOverlay();
  return (
    <div>
      <button onClick={() => openManager("Alice")}>open-manager</button>
      <button onClick={() => openTrophy("golden_boot")}>open-trophy</button>
    </div>
  );
}

test("useOverlay returns the openers passed to OverlayProvider", () => {
  const openManager = vi.fn();
  const openTrophy = vi.fn();
  render(
    <OverlayProvider value={{ openManager, openTrophy }}>
      <Consumer />
    </OverlayProvider>
  );

  screen.getByText("open-manager").click();
  screen.getByText("open-trophy").click();

  expect(openManager).toHaveBeenCalledWith("Alice");
  expect(openTrophy).toHaveBeenCalledWith("golden_boot");
});

test("useOverlay defaults to no-op openers when used outside a provider", () => {
  expect(() => {
    render(<Consumer />);
    screen.getByText("open-manager").click();
    screen.getByText("open-trophy").click();
  }).not.toThrow();
});
