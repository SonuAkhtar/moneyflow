"use client";

import { useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Select } from "@/components/Select/Select";
import { Button } from "@/components/Button/Button";
import { Avatar } from "@/components/Avatar/Avatar";
import { useFinanceStore } from "@/store/financeStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/useToast";
import type { Profile } from "@/types";
import styles from "./EditProfileSheet.module.scss";

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

const CURRENCIES = [
  { label: "₹ Indian Rupee (INR)", value: "INR" },
  { label: "$ US Dollar (USD)", value: "USD" },
  { label: "€ Euro (EUR)", value: "EUR" },
  { label: "£ British Pound (GBP)", value: "GBP" },
  { label: "د.إ UAE Dirham (AED)", value: "AED" },
  { label: "$ Australian Dollar (AUD)", value: "AUD" },
  { label: "$ Canadian Dollar (CAD)", value: "CAD" },
  { label: "¥ Japanese Yen (JPY)", value: "JPY" },
  { label: "$ Singapore Dollar (SGD)", value: "SGD" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_DIM = 256;

// Downscale + re-encode the picked image so we store a small data URL instead
// of a multi-MB original on the profile row.
const compressAvatar = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image"));
      img.onload = () => {
        const scale = Math.min(
          1,
          MAX_AVATAR_DIM / Math.max(img.width, img.height),
        );
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

export const EditProfileSheet = ({ open, onClose }: EditProfileSheetProps) => {
  const profile = useFinanceStore((s) => s.profile);
  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile">
      {open && profile && (
        <ProfileForm key={profile.id} profile={profile} onClose={onClose} />
      )}
    </BottomSheet>
  );
};

interface ProfileFormProps {
  profile: Profile;
  onClose: () => void;
}

const ProfileForm = ({ profile, onClose }: ProfileFormProps) => {
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const updateName = useAuthStore((s) => s.updateName);
  const toast = useToast();

  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [currency, setCurrency] = useState(profile.currency || "INR");
  const [savingsTarget, setSavingsTarget] = useState(
    profile.savingsTarget ? String(profile.savingsTarget) : "",
  );
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatarUrl ?? null,
  );

  const nameError = fullName.trim() ? undefined : "Name is required";
  const emailError = EMAIL_RE.test(email.trim())
    ? undefined
    : "Enter a valid email";
  const canSave = !nameError && !emailError;

  const onPickAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10_000_000) {
      toast({
        title: "Image too large",
        description: "Pick one under 10MB",
        variant: "error",
      });
      return;
    }
    try {
      setAvatarUrl(await compressAvatar(file));
    } catch {
      toast({ title: "Couldn't use that image", variant: "error" });
    }
  };

  const save = () => {
    if (!canSave) return;
    updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      currency,
      savingsTarget: Math.max(0, Number(savingsTarget) || 0),
      avatarUrl,
    });
    updateName(fullName.trim());
    toast({ title: "Profile updated", variant: "success" });
    onClose();
  };

  return (
    <div className={styles.form}>
      <label className={styles.avatar}>
        <Avatar name={fullName || "MF"} src={avatarUrl} size={84} />
        <span className={styles.avatar_badge}>
          <Camera size={15} />
        </span>
        <input
          type="file"
          accept="image/*"
          className={styles.avatar_input}
          onChange={onPickAvatar}
        />
      </label>

      <Input
        label="Full name"
        value={fullName}
        error={nameError}
        onChange={(e) => setFullName(e.target.value)}
      />
      <Input
        label="Email"
        type="email"
        value={email}
        error={emailError}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label="Phone"
        type="tel"
        placeholder="+91 90000 00000"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <Select
        label="Currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        options={CURRENCIES}
      />
      <Input
        label="Monthly savings target"
        type="number"
        inputMode="decimal"
        placeholder="0"
        value={savingsTarget}
        onChange={(e) => setSavingsTarget(e.target.value)}
      />

      <Button size="lg" fullWidth onClick={save} disabled={!canSave}>
        Save changes
      </Button>
    </div>
  );
};
