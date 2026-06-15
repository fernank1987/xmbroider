import {
  adminCard,
  adminCardHint,
  adminCardMutedLabel,
  adminCardValue,
} from "../lib/adminStyles";

type AdminStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export default function AdminStatCard({ label, value, hint }: AdminStatCardProps) {
  return (
    <div className={`${adminCard} p-5`}>
      <p className={adminCardMutedLabel}>{label}</p>
      <p className={adminCardValue}>{value}</p>
      {hint && <p className={adminCardHint}>{hint}</p>}
    </div>
  );
}
