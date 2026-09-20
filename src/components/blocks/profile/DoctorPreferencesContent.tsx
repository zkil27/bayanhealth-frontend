"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Check, Pencil, X } from "lucide-react";
import {
  UserDoctorPreferencesValues,
  userDoctorPreferencesSchema,
} from "@/schemas/userSchema";
import { useUserId } from "@/stores/useAuthStore";
import { DoctorPreferences } from "@/features/booking/components/patient/DoctorPreferences";
import { useUserDoctorPreference } from "@/hooks/useUserDoctorPreference";

/**
 * No preselected preferences.
 *
 * These used to default to `["male"]` and `["tagalog"]`, which read to the
 * patient as choices they had already made. A doctor preference is the patient's
 * to state, and an unstated one must stay empty — the booking matcher treats an
 * empty preference as "no preference", which is the correct reading of silence.
 */
const defaultValues: UserDoctorPreferencesValues = {
  genderPreferences: [],
  languagePreferences: [],
};

export function DoctorPreferencesContent() {
  const userId = useUserId();
  const {
    doctorPreferences,
    isLoading,
    isPersisted,
    updateDoctorPreferences,
  } = useUserDoctorPreference(userId);
  const [isEditing, setIsEditing] = useState(false);

  const methods = useForm<UserDoctorPreferencesValues>({
    resolver: zodResolver(userDoctorPreferencesSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting },
  } = methods;

  useEffect(() => {
    if (doctorPreferences) {
      reset(doctorPreferences);
    }
  }, [doctorPreferences, reset]);

  const onSubmit = async (data: UserDoctorPreferencesValues) => {
    await updateDoctorPreferences(data);
    setIsEditing(false);
  };

  const handleCancel = () => {
    reset(doctorPreferences || defaultValues);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-muted-foreground">Loading your Preferences...</div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-6 flex items-center justify-between border-b pb-4 ">
          <div>
            <h1 className="text-2xl font-semibold">Doctor Preferences</h1>
            {/*
             * The old subtitle was "This will be used to prefill booking forms",
             * next to a Save button whose mutation stored nothing at all. The
             * claim now matches what the hook can actually do: prefill within
             * this session, and say plainly that nothing is stored
             * (ADR-20260806-02).
             */}
            <p className="text-sm text-muted-foreground">
              Used to prefill booking forms in this browsing session
            </p>
            {!isPersisted && (
              <p
                className="mt-1 text-xs text-muted-foreground"
                data-slot="doctor-preferences-not-stored"
              >
                Not stored on your account — there is no preference storage yet,
                so these choices are cleared when you reload or sign in again.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  key="cancel-edit"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="border-muted"
                >
                  <X className="mr-2 size-4" />
                  Cancel
                </Button>
                {/*
                 * "Save" / "Saving..." described a round trip that does not
                 * exist. "Apply" is what actually happens: the values are held
                 * for this session and used by the booking form.
                 */}
                <Button
                  key="save-edit"
                  type="submit"
                  size="sm"
                  disabled={!isDirty || !isValid || isSubmitting}
                >
                  <Check className="mr-2 size-4" />
                  {isSubmitting ? "Applying..." : "Apply"}
                </Button>
              </>
            ) : (
              <Button
                key="edit-button"
                type="button"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <DoctorPreferences readOnly={!isEditing} data={doctorPreferences} />
        </div>
      </form>
    </FormProvider>
  );
}
