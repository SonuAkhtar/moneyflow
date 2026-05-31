"use client";

import { useState, type ChangeEvent } from "react";
import { Camera } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { Input } from "@/components/Input/Input";
import { Button } from "@/components/Button/Button";
import { Avatar } from "@/components/Avatar/Avatar";
import { useFinanceStore } from "@/store/financeStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/useToast";
import styles from "./EditProfileSheet.module.scss";

interface EditProfileSheetProps {
  open: boolean;
  onClose: () => void;
}

export const EditProfileSheet = ({ open, onClose }: EditProfileSheetProps) => {
  const profile = useFinanceStore((s) => s.profile);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const updateName = useAuthStore((s) => s.updateName);
  const toast = useToast();

  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl ?? null);

  const onPickAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      toast({ title: "Image too large", description: "Pick one under 2.5MB", variant: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = () => {
    updateProfile({
      fullName,
      email,
      phone: phone || null,
      avatarUrl,
    });
    updateName(fullName);
    toast({ title: "Profile updated", variant: "success" });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit profile">
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

        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="+91 90000 00000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Button size="lg" fullWidth onClick={save}>
          Save changes
        </Button>
      </div>
    </BottomSheet>
  );
};
