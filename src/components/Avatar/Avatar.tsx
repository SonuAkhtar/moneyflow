import { initialsOf, cn } from "@/utils";
import styles from "./Avatar.module.scss";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

export const Avatar = ({ name, src, size = 44, className }: AvatarProps) => (
  <div
    className={cn(styles.avatar, className)}
    style={{ width: size, height: size, fontSize: size * 0.36 }}
  >
    {src ? (
      <img src={src} alt={name} className={styles.avatar_img} />
    ) : (
      <span>{initialsOf(name)}</span>
    )}
  </div>
);
