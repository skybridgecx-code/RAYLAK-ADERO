import type { BookingStatus } from "@raylak/shared/enums";

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  new_request:        { label: "New Request",       className: "bg-amber-50 text-amber-700 border-amber-200" },
  quoted:             { label: "Quoted",             className: "bg-blue-50 text-blue-700 border-blue-200" },
  confirmed:          { label: "Confirmed",          className: "bg-green-50 text-green-700 border-green-200" },
  assigned:           { label: "Assigned",           className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  driver_en_route:    { label: "En Route",           className: "bg-violet-50 text-violet-700 border-violet-200" },
  driver_arrived:     { label: "Driver Arrived",     className: "bg-purple-50 text-purple-700 border-purple-200" },
  passenger_picked_up:{ label: "Picked Up",          className: "bg-teal-50 text-teal-700 border-teal-200" },
  completed:          { label: "Completed",          className: "bg-gray-50 text-gray-600 border-gray-200" },
  canceled:           { label: "Canceled",           className: "bg-red-50 text-red-700 border-red-200" },
  no_show:            { label: "No Show",            className: "bg-orange-50 text-orange-700 border-orange-200" },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
