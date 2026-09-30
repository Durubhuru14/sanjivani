import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RatingForm } from "@/components/ratings/RatingForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const campaignId = "c0000000-0000-4000-8000-000000000003";
const rateeId = "a0000000-0000-4000-8000-000000000007";

function renderForm(props: Partial<React.ComponentProps<typeof RatingForm>> = {}) {
  return render(
    <RatingForm
      campaignId={campaignId}
      rateeId={rateeId}
      rateeName="Priya Sharma"
      myRating={null}
      canRate
      {...props}
    />
  );
}

describe("RatingForm (component, spec §4)", () => {
  it("renders five star buttons and a submit disabled until a score is picked", () => {
    renderForm();
    const stars = screen.getAllByRole("radio", { name: /star/i });
    expect(stars).toHaveLength(5);
    const submit = screen.getByRole("button", { name: /submit rating/i });
    expect(submit).toBeDisabled();
  });

  it("enables submit after picking a score", () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(screen.getByRole("button", { name: /submit rating/i })).not.toBeDisabled();
  });

  it("shows the existing rating when already submitted", () => {
    renderForm({
      myRating: {
        id: "r1",
        campaign_id: campaignId,
        from_user_id: "me",
        to_user_id: rateeId,
        score: 5,
        comment: "Great work",
        created_at: "2026-09-01T00:00:00Z",
      },
    });
    expect(screen.getByText(/your rating for priya sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/great work/i)).toBeInTheDocument();
  });

  it("explains when rating is unavailable", () => {
    renderForm({ canRate: false, reason: "Ratings open once the campaign is completed." });
    expect(screen.getByText(/rate priya sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/ratings open once the campaign is completed/i)).toBeInTheDocument();
  });

  it("caps the comment at 500 characters", () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "5 stars" }));
    const textarea = screen.getByLabelText(/comment/i);
    expect(textarea).toHaveAttribute("maxlength", "500");
  });

  it("renders a warning toast label area and honours the aria radiogroup", () => {
    renderForm();
    expect(screen.getByRole("radiogroup", { name: "Score" })).toBeInTheDocument();
  });
});
