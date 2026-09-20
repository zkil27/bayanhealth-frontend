"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { PersonDataSection } from "@/components/blocks/profile/PersonDataSection";
import { profileSchema, ProfileFormValues } from "@/schemas/userSchema";
import { useUserId } from "@/stores/useAuthStore";

const defaultValues: ProfileFormValues = {
  forWhom: "self",
  relationship: "",
  name: "",
  preferredName: "",
  preferredPronoun: "",
  dateOfBirth: "",
  genderAtBirth: "prefer not to say",
  weight: "",
  height: "",
  bloodType: "",
  allergens: [],
  otherAllergens: "",
  diet: [],
};

export function ProfileContent() {
  const userId = useUserId();
  const { profile, isLoading, updateProfile } = useProfile(userId);
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const methods = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isDirty, isValid, isSubmitting },
  } = methods;

  useEffect(() => {
    if (profile && !isDirty) {
      reset(profile);
    }
  }, [profile, reset, isDirty]);

  const onSubmit = async (data: ProfileFormValues) => {
    setSaveError(null);
    try {
      await updateProfile(data);
      setIsEditing(false);
    } catch (err) {
      // A failed save must not read as a successful one — keep the form open and
      // say so, rather than closing the editor over unsaved changes.
      setSaveError(
        err instanceof Error
          ? err.message
          : "We could not save your profile. Please try again.",
      );
    }
  };

  const handleCancel = () => {
    reset(profile || defaultValues);
    setSaveError(null);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-6 flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="text-sm text-muted-foreground">
              {isEditing
                ? "Edit a profile information"
                : "View a profile information"}
            </p>
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
                <Button
                  key="save-edit"
                  type="submit"
                  size="sm"
                  disabled={!isDirty || !isValid || isSubmitting}
                >
                  <Save className="mr-2 size-4" />
                  {isSubmitting ? "Saving..." : "Save"}
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

        {saveError && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {saveError}
          </p>
        )}

        <PersonDataSection
          readOnly={!isEditing}
          userProfile={profile}
          mode="profile"
        />
      </form>
    </FormProvider>
  );
}
