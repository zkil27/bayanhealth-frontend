"use client";

import { useCallback, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";

import { AsyncView } from "@/components/async-view";
import { BookingNavBar } from "@/features/booking/components/BookingNavBar";
import { BrandCtaButton, EmergencyNote } from "@/features/booking/components/BrandUI";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  fetchDoctorDetail,
  type DoctorDetailData,
  type BackendSlot,
} from "@/features/booking/lib/api/doctors";
import { selectableSlots } from "@/features/booking/lib/slotTime";

export default function DoctorDetailPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const { doctorId } = use(params);
  const idToken = useAuthStore((s) => s.session?.idToken ?? null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const router = useRouter();

  const fetcher = useCallback(
    () => fetchDoctorDetail(doctorId, idToken ?? ""),
    [doctorId, idToken],
  );

  return (
    <AsyncView<DoctorDetailData> fetcher={fetcher} deps={[doctorId, idToken]}>
      {(data) => (
        <DoctorDetailContent
          data={data}
          selectedSlotId={selectedSlotId}
          onSlotSelect={setSelectedSlotId}
          onBook={() => {
            if (selectedSlotId) {
              router.push(
                `/patient/booking/createBooking/${doctorId}?slotId=${selectedSlotId}`,
              );
            }
          }}
        />
      )}
    </AsyncView>
  );
}

/**
 * The header used to render `ID: {doctorId.slice(-6).toUpperCase()}` beneath the
 * doctor's name. That value is the last six characters of the doctor's Cognito
 * `sub` — meaningless to a patient, and an internal identifier the UI has no
 * reason to disclose. The row was removed rather than relabelled: there is no
 * patient-facing doctor identifier on the platform to show in its place.
 * `doctorId` is still used by the page for fetching and for the booking route,
 * just never as human-facing content.
 */
function DoctorDetailContent({
  data,
  selectedSlotId,
  onSlotSelect,
  onBook,
}: {
  data: DoctorDetailData;
  selectedSlotId: string | null;
  onSlotSelect: (slotId: string | null) => void;
  onBook: () => void;
}) {
  // `status === "available"` is necessary but not sufficient: a 09:00 slot is
  // still `available` at 15:00 the same day, and the backend now refuses a slot
  // that has already started with `409 SLOT_UNAVAILABLE`. Offering one would fail
  // at the last step of the booking flow, so past slots are not offered.
  const availableSlots = selectableSlots(data.slots);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-8">
      {/*
       * Back to the directory, not to `/patient/booking` — that is the path chooser
       * now, and a patient who has drilled into a doctor came from the search
       * results and expects to land back among them.
       */}
      <BookingNavBar
        header={data.profile.fullName}
        subtitle={data.profile.specialty ?? "Specialty not listed"}
        backHref="/patient/booking/search"
      />

      {/* Slots section */}
      <div className="mx-4 flex flex-col gap-4 rounded-(--radius-card) border border-(--border-subtle) bg-(--surface-card) p-4 shadow-(--shadow-card) md:mx-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[16px] font-bold tracking-[-0.01em] text-(--text-heading)">
            Available time slots
          </h2>
          <p className="text-[13.5px] text-(--text-muted)">
            Pick a time and this booking goes straight to {data.profile.fullName}.
          </p>
        </div>

        {availableSlots.length === 0 ? (
          <p className="text-[14.5px] text-(--text-muted)">
            No available slots — check back later
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {availableSlots.map((slot) => (
                <SlotButton
                  key={slot.slotId}
                  slot={slot}
                  isSelected={selectedSlotId === slot.slotId}
                  onSelect={() =>
                    onSlotSelect(
                      selectedSlotId === slot.slotId ? null : slot.slotId,
                    )
                  }
                />
              ))}
            </div>

            <BrandCtaButton
              type="button"
              onClick={onBook}
              disabled={selectedSlotId === null}
              className="sm:w-auto sm:self-start sm:px-8"
            >
              Book appointment
            </BrandCtaButton>
          </>
        )}

        <EmergencyNote />
      </div>
    </div>
  );
}

function SlotButton({
  slot,
  isSelected,
  onSelect,
}: {
  slot: BackendSlot;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`min-h-11 rounded-(--radius-pill) border px-4 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) ${
        isSelected
          ? "border-(--action-primary) bg-(--surface-accent-soft) font-bold text-(--status-available-fg)"
          : "border-(--border-default) bg-(--surface-card) font-semibold text-(--text-body) hover:bg-(--action-secondary-hover-surface)"
      }`}
    >
      {slot.date} · {slot.startTime}
    </button>
  );
}
